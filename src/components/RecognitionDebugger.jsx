import { useRef, useEffect, useState } from 'react'
import { normalizeGesture, recognizeGestureDebug } from '../utils/gestureRecognizer'
import { LETTER_TEMPLATES } from '../utils/letterTemplates'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'

const MIN_POINTS       = 8
const DROPOUT_GRACE_MS = 150  // ignore pinch dropouts shorter than this
const MIN_RECORD_MS    = 300  // must record for at least this long to count

export default function RecognitionDebugger({ handsRef, isActive, onClose }) {
  const canvasRef        = useRef(null)
  const animFrameRef     = useRef(null)
  const strokePoints     = useRef([])
  const isRecording      = useRef(false)
  const recordStartTime  = useRef(null)
  const lastPinchTime    = useRef(null)  // last time we saw a pinch
  const dropoutTimer     = useRef(null)

  const [results,    setResults]    = useState([])
  const [pointCount, setPointCount] = useState(0)
  const [status,     setStatus]     = useState('waiting')

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const hands  = handsRef.current || []
      const canvas = canvasRef.current
      if (!canvas) { animFrameRef.current = requestAnimationFrame(loop); return }

      const W = window.innerWidth
      const H = window.innerHeight
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W
        canvas.height = H
      }

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      const now         = performance.now()
      let   pinching    = false
      let   activeHand  = null

      for (const hand of hands) {
        if (getGesture(hand.landmarks, false) === 'pinch') {
          pinching   = true
          activeHand = hand
          break
        }
      }

      if (pinching && activeHand) {
        lastPinchTime.current = now

        // Clear any pending dropout timer
        if (dropoutTimer.current) {
          clearTimeout(dropoutTimer.current)
          dropoutTimer.current = null
        }

        if (!isRecording.current) {
          // Start recording immediately — no confirmation delay
          isRecording.current   = true
          recordStartTime.current = now
          strokePoints.current  = []
          setStatus('recording')
        }

        const pos = getIndexTipPosition(activeHand.landmarks, W, H)
        strokePoints.current.push(pos)
        setPointCount(strokePoints.current.length)

      } else {
        // No pinch detected this frame
        const timeSinceLastPinch = lastPinchTime.current
          ? now - lastPinchTime.current
          : Infinity

        if (isRecording.current && timeSinceLastPinch > DROPOUT_GRACE_MS) {
          // Pinch has been gone long enough — finalize
          const recordedMs = recordStartTime.current
            ? now - recordStartTime.current
            : 0

          if (strokePoints.current.length >= MIN_POINTS && recordedMs >= MIN_RECORD_MS) {
            const normalized = normalizeGesture(strokePoints.current)
            if (normalized) {
              const allResults = recognizeGestureDebug(normalized, LETTER_TEMPLATES)
              setResults(allResults)
              setStatus('done')
            }
          } else {
            setStatus('waiting')
          }

          isRecording.current     = false
          recordStartTime.current = null
          lastPinchTime.current   = null
          strokePoints.current    = []
          setPointCount(0)
        }
      }

      // Draw current stroke
      if (strokePoints.current.length > 1) {
        ctx.save()
        ctx.strokeStyle = isRecording.current ? '#a78bfa' : '#ffffff22'
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
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (dropoutTimer.current) clearTimeout(dropoutTimer.current)
    }
  }, [isActive, handsRef])

  const statusColors = {
    waiting:   'rgba(255,255,255,0.3)',
    recording: '#a78bfa',
    done:      '#34d399',
  }

  return (
    <div className="absolute inset-0 z-50">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-white/70 font-bold text-sm">🔬 Debugger</span>
          <span className="text-xs px-2 py-1 rounded-full font-mono"
            style={{
              background: `${statusColors[status]}20`,
              color: statusColors[status],
              border: `1px solid ${statusColors[status]}50`,
            }}>
            {status} · {pointCount} pts
          </span>
        </div>
        <button onClick={onClose}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full hover:bg-white/5 transition-all">
          ✕ Close
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-20 right-6 w-72 max-h-[70vh] overflow-y-auto rounded-2xl p-4"
          style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-white/40 text-xs mb-3 font-mono">Closest → Furthest</p>
          {results.map((r, i) => (
            <div key={r.character}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span className="text-xl font-bold w-8"
                style={{ color: i === 0 ? '#34d399' : i < 3 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
                {r.character}
              </span>
              <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden bg-white/5">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, r.confidence * 100)}%`,
                    background: i === 0 ? '#34d399' : 'rgba(255,255,255,0.25)',
                  }} />
              </div>
              <span className="text-xs font-mono w-16 text-right"
                style={{ color: i === 0 ? '#34d399' : 'rgba(255,255,255,0.25)' }}>
                {r.distance.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <p className="text-xs text-white/20">
          Pinch and hold — trace slowly — release when done
        </p>
      </div>
    </div>
  )
}