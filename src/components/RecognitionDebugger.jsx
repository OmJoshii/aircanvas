import { useRef, useEffect, useState } from 'react'
import { normalizeGesture, recognizeGestureDebug } from '../utils/gestureRecognizer'
import { LETTER_TEMPLATES } from '../utils/letterTemplates'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'

const MIN_POINTS        = 5
const PINCH_CONFIRM_MS  = 80   // must hold pinch this long before recording starts
const RELEASE_GRACE_MS  = 120  // keep recording this long after pinch releases

export default function RecognitionDebugger({ handsRef, isActive, onClose }) {
  const canvasRef         = useRef(null)
  const animFrameRef      = useRef(null)
  const strokePoints      = useRef([])
  const isPinching        = useRef(false)
  const pinchStartTime    = useRef(null)
  const releaseTime       = useRef(null)
  const isRecording       = useRef(false)

  const [results,    setResults]    = useState([])
  const [pointCount, setPointCount] = useState(0)
  const [status,     setStatus]     = useState('waiting') // waiting | confirming | recording | done

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

      const now       = performance.now()
      let   pinching  = false
      let   activeHand = null

      for (const hand of hands) {
        if (getGesture(hand.landmarks, false) === 'pinch') {
          pinching  = true
          activeHand = hand
          break
        }
      }

      if (pinching && activeHand) {
        releaseTime.current = null

        if (!isPinching.current) {
          // Pinch just started — start the confirmation timer
          isPinching.current   = true
          pinchStartTime.current = now
          setStatus('confirming')
        }

        const heldMs = now - pinchStartTime.current

        if (heldMs >= PINCH_CONFIRM_MS) {
          // Pinch confirmed — start/continue recording
          if (!isRecording.current) {
            strokePoints.current = []
            isRecording.current  = true
            setStatus('recording')
          }

          const pos = getIndexTipPosition(activeHand.landmarks, W, H)
          strokePoints.current.push(pos)
          setPointCount(strokePoints.current.length)
        }

      } else {
        if (isPinching.current) {
          // Pinch just released
          isPinching.current = false

          if (releaseTime.current === null) {
            releaseTime.current = now
          }

          const gracePassed = now - releaseTime.current >= RELEASE_GRACE_MS

          if (!gracePassed) {
            // Still within grace period — keep recording a bit longer
            if (isRecording.current && activeHand) {
              // can't add more points without a hand — just wait
            }
          } else {
            // Grace period over — finalize the stroke
            if (isRecording.current && strokePoints.current.length >= MIN_POINTS) {
              const normalized = normalizeGesture(strokePoints.current)
              if (normalized) {
                const allResults = recognizeGestureDebug(normalized, LETTER_TEMPLATES)
                setResults(allResults)
                setStatus('done')
              }
            }
            isRecording.current    = false
            pinchStartTime.current = null
            releaseTime.current    = null
          }
        }
      }

      // Draw current stroke
      if (strokePoints.current.length > 1) {
        ctx.save()
        ctx.strokeStyle = isRecording.current ? '#a78bfa' : '#ffffff44'
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
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [isActive, handsRef])

  const statusColor = {
    waiting:    'rgba(255,255,255,0.2)',
    confirming: '#fbbf24',
    recording:  '#a78bfa',
    done:       '#34d399',
  }

  return (
    <div className="absolute inset-0 z-50">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-white/70 font-bold tracking-wide text-sm">🔬 Recognition Debugger</span>
          <span className="text-xs px-2 py-1 rounded-full font-mono"
            style={{ background: `${statusColor[status]}20`, color: statusColor[status], border: `1px solid ${statusColor[status]}40` }}>
            {status} · {pointCount} pts
          </span>
        </div>
        <button onClick={onClose}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5">
          ✕ Close
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-20 right-6 w-72 max-h-[70vh] overflow-y-auto rounded-2xl p-4"
          style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-white/40 text-xs mb-3 font-mono">Sorted closest → furthest</p>
          {results.map((r, i) => (
            <div key={r.character}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span className="text-xl font-bold w-8"
                style={{ color: i === 0 ? '#34d399' : i < 3 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                {r.character}
              </span>
              <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${r.confidence * 100}%`,
                  background: i === 0 ? '#34d399' : 'rgba(255,255,255,0.3)',
                }} />
              </div>
              <span className="text-xs font-mono w-16 text-right" style={{ color: i === 0 ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                {r.distance.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <p className="text-xs text-white/20">
          Hold pinch and trace a letter slowly, then release
        </p>
      </div>
    </div>
  )
}