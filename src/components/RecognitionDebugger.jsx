import { useRef, useEffect, useState } from 'react'
import { normalizeGesture, recognizeGestureDebug } from '../utils/gestureRecognizer'
import { LETTER_TEMPLATES } from '../utils/letterTemplates'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'

const MIN_POINTS = 5

export default function RecognitionDebugger({ handsRef, isActive, onClose }) {
  const canvasRef    = useRef(null)
  const animFrameRef = useRef(null)
  const strokePoints  = useRef([])
  const wasPinching   = useRef(false)

  const [results, setResults] = useState([])
  const [pointCount, setPointCount] = useState(0)

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const hands  = handsRef.current || []
      const canvas = canvasRef.current
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      const W = window.innerWidth
      const H = window.innerHeight
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W
        canvas.height = H
      }

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      let pinching = false
      let activeHand = null

      for (const hand of hands) {
        const g = getGesture(hand.landmarks, false)
        if (g === 'pinch') {
          pinching = true
          activeHand = hand
          break
        }
      }

      if (pinching && activeHand) {
        const pos = getIndexTipPosition(activeHand.landmarks, W, H)

        if (!wasPinching.current) {
          strokePoints.current = [pos]
        } else {
          strokePoints.current.push(pos)
        }

        setPointCount(strokePoints.current.length)

        ctx.save()
        ctx.strokeStyle = '#a78bfa'
        ctx.lineWidth   = 4
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.shadowColor = '#a78bfa'
        ctx.shadowBlur  = 10
        ctx.beginPath()
        strokePoints.current.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        ctx.restore()

        wasPinching.current = true
      } else {
        if (wasPinching.current && strokePoints.current.length >= MIN_POINTS) {
          const normalized = normalizeGesture(strokePoints.current)
          if (normalized) {
            const allResults = recognizeGestureDebug(normalized, LETTER_TEMPLATES)
            setResults(allResults)
          }
          strokePoints.current = []
        }
        wasPinching.current = false
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, handsRef])

  return (
    <div className="absolute inset-0 z-50">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <span className="text-white/70 font-bold tracking-wide text-sm">🔬 Recognition Debugger</span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          ✕ Close
        </button>
      </div>

      <div className="absolute top-16 left-6 text-white/30 text-xs">
        Points in current stroke: {pointCount}
      </div>

      {/* Results table — all templates sorted by closeness */}
      {results.length > 0 && (
        <div
          className="absolute top-24 right-6 w-72 max-h-[70vh] overflow-y-auto rounded-2xl p-4"
          style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-white/40 text-xs mb-3">Sorted closest → furthest</p>
          {results.map((r, i) => (
            <div
              key={r.character}
              className="flex items-center justify-between py-2"
              style={{
                borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                opacity: i === 0 ? 1 : 0.5,
              }}
            >
              <span
                className="text-xl font-bold w-8"
                style={{ color: i === 0 ? '#34d399' : 'rgba(255,255,255,0.6)' }}
              >
                {r.character}
              </span>
              <span className="text-xs text-white/40 font-mono">
                d: {r.distance.toFixed(1)}
              </span>
              <span className="text-xs text-white/40 font-mono w-12 text-right">
                {(r.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <p className="text-xs text-white/20">
          Pinch and trace a letter, release to see how it scores against every template
        </p>
      </div>
    </div>
  )
}