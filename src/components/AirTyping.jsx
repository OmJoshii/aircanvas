import { useRef, useEffect, useState, useCallback } from 'react'
import { normalizeGesture, recognizeGesture } from '../utils/gestureRecognizer'
import { LETTER_TEMPLATES } from '../utils/letterTemplates'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'

const MIN_POINTS_TO_RECOGNIZE = 5   // ignore tiny accidental taps
const CONFIDENCE_THRESHOLD    = 0.55 // below this, we don't accept the match

export default function AirTyping({ handsRef, isActive, onClose }) {
  const canvasRef       = useRef(null)
  const animFrameRef    = useRef(null)
  const strokePoints     = useRef([])   // raw points of current trace
  const wasPinching      = useRef(false)
  const pinchHandSide     = useRef(null)

  const [typedText, setTypedText]   = useState('')
  const [lastChar,  setLastChar]    = useState(null)
  const [lastConfidence, setLastConfidence] = useState(0)
  const [isTracing, setIsTracing]   = useState(false)

  const recognizeCurrentStroke = useCallback(() => {
    const pts = strokePoints.current
    if (pts.length < MIN_POINTS_TO_RECOGNIZE) {
      strokePoints.current = []
      return
    }

    const normalized = normalizeGesture(pts)
    if (!normalized) {
      strokePoints.current = []
      return
    }

    const { character, confidence, distance } = recognizeGesture(normalized, LETTER_TEMPLATES)

    // Temporary debug log — shows exactly how close the match was
    console.log(`Traced shape matched "${character}" — distance: ${distance.toFixed(1)}, confidence: ${confidence.toFixed(2)}`)

    setLastChar(character)
    setLastConfidence(confidence)

    if (confidence >= CONFIDENCE_THRESHOLD) {
      setTypedText(prev => prev + character)
    }

    strokePoints.current = []
  }, [])

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

      // Determine pinch state from the first detected hand
      let pinching = false
      let activeHand = null

      if (hands.length > 0) {
        // Use whichever hand is pinching, prefer the previous tracking hand
        for (const hand of hands) {
          const g = getGesture(hand.landmarks, pinchHandSide.current === hand.handedness)
          if (g === 'pinch') {
            pinching = true
            activeHand = hand
            break
          }
        }
      }

      if (pinching && activeHand) {
        const pos = getIndexTipPosition(activeHand.landmarks, W, H)
        pinchHandSide.current = activeHand.handedness

        if (!wasPinching.current) {
          // Just started a new trace
          strokePoints.current = [pos]
          setIsTracing(true)
        } else {
          strokePoints.current.push(pos)
        }

        // Draw the live trace path
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
        if (wasPinching.current) {
          // Pinch just released — recognize the completed stroke
          recognizeCurrentStroke()
          setIsTracing(false)
        }
        wasPinching.current = false
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, handsRef, recognizeCurrentStroke])

  return (
    <div className="absolute inset-0 z-40">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <span className="text-white/70 font-bold tracking-wide text-sm">✎ Air Typing</span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          ✕ Exit Air Typing
        </button>
      </div>

      {/* Typed text display */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
        <div
          className="rounded-2xl px-6 py-5 min-h-[90px] text-3xl font-mono tracking-wide flex items-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {typedText || <span style={{ color: 'rgba(255,255,255,0.2)' }}>Pinch and trace a letter...</span>}
          <span className="inline-block w-0.5 h-7 bg-white/40 ml-1 animate-pulse" />
        </div>
      </div>

      {/* Last recognized character feedback */}
      {lastChar && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div
            className="px-5 py-3 rounded-2xl flex items-center gap-3"
            style={{
              background: lastConfidence >= CONFIDENCE_THRESHOLD ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${lastConfidence >= CONFIDENCE_THRESHOLD ? 'rgba(52,211,153,0.35)' : 'rgba(239,68,68,0.35)'}`,
            }}
          >
            <span className="text-3xl font-bold"
              style={{ color: lastConfidence >= CONFIDENCE_THRESHOLD ? '#34d399' : '#ef4444' }}>
              {lastChar}
            </span>
            <div>
              <p className="text-xs" style={{ color: lastConfidence >= CONFIDENCE_THRESHOLD ? '#34d399' : '#ef4444' }}>
                {lastConfidence >= CONFIDENCE_THRESHOLD ? 'Recognized' : 'Low confidence, try again'}
              </p>
              <div className="w-24 h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(lastConfidence * 100)}%`,
                    background: lastConfidence >= CONFIDENCE_THRESHOLD ? '#34d399' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <button
          onClick={() => setTypedText(prev => prev.slice(0, -1))}
          className="px-4 py-2 rounded-full text-sm text-white/50 hover:text-white/80 transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ⌫ Backspace
        </button>
        <button
          onClick={() => setTypedText(prev => prev + ' ')}
          className="px-4 py-2 rounded-full text-sm text-white/50 hover:text-white/80 transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ␣ Space
        </button>
        <button
          onClick={() => setTypedText('')}
          className="px-4 py-2 rounded-full text-sm text-white/50 hover:text-white/80 transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ✕ Clear text
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
        <p className="text-xs text-white/20">
          Supports: O C I L V N M Z S U X W · numbers 0 1 7
        </p>
      </div>

    </div>
  )
}