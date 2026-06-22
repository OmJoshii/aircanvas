import { useRef, useEffect, useState, useCallback } from 'react'
import { getIndexTipPosition } from '../utils/gestureUtils'

// ── Keyboard layout ────────────────────────────────────────────────────────
const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]
const SPECIAL_KEYS = [
  { label: '⌫',  value: 'BACKSPACE', width: 1.8 },
  { label: '␣',  value: 'SPACE',     width: 3   },
  { label: '⏎',  value: 'ENTER',     width: 1.8 },
  { label: '✕',  value: 'CLEAR',     width: 1.5 },
]

// ── Key dimensions (in px) ─────────────────────────────────────────────────
const KEY_W       = 58
const KEY_H       = 52
const KEY_GAP     = 6
const DWELL_MS    = 700   // how long to hover before triggering

export default function AirKeyboard({ handsRef, isActive, onClose }) {
  const canvasRef       = useRef(null)
  const animFrameRef    = useRef(null)
  const dwellRef        = useRef({ key: null, startTime: null, progress: 0 })
  const lastTriggerRef  = useRef(null)   // prevent double-firing same key

  const [typedText, setTypedText] = useState('')
  const [hoveredKey, setHoveredKey] = useState(null)
  const [dwellProgress, setDwellProgress] = useState(0)

  // ── Build key layout with screen positions ─────────────────────────────
  const buildKeys = useCallback(() => {
    const keys   = []
    const totalW = window.innerWidth
    const totalH = window.innerHeight

    // Keyboard sits in the lower third of the screen
    const kbTop  = totalH * 0.58

    // Each row is centered horizontally
    ROWS.forEach((row, rowIdx) => {
      const rowWidth = row.length * (KEY_W + KEY_GAP) - KEY_GAP
      const rowLeft  = (totalW - rowWidth) / 2
      const rowTop   = kbTop + rowIdx * (KEY_H + KEY_GAP)

      row.forEach((char, colIdx) => {
        const x = rowLeft + colIdx * (KEY_W + KEY_GAP)
        const y = rowTop
        keys.push({
          label: char,
          value: char,
          x, y,
          w: KEY_W,
          h: KEY_H,
        })
      })
    })

    // Special keys row
    const specRow    = kbTop + ROWS.length * (KEY_H + KEY_GAP)
    const totalSpecW = SPECIAL_KEYS.reduce((sum, k) => sum + k.width * KEY_W + KEY_GAP, -KEY_GAP)
    let specX        = (totalW - totalSpecW) / 2

    SPECIAL_KEYS.forEach(k => {
      const w = k.width * KEY_W
      keys.push({
        label: k.label,
        value: k.value,
        x: specX, y: specRow,
        w, h: KEY_H,
      })
      specX += w + KEY_GAP
    })

    return keys
  }, [])

  // ── Handle a confirmed keypress ────────────────────────────────────────
  const handleKeyPress = useCallback((key) => {
    if (key.value === 'BACKSPACE') {
      setTypedText(t => t.slice(0, -1))
    } else if (key.value === 'SPACE') {
      setTypedText(t => t + ' ')
    } else if (key.value === 'ENTER') {
      setTypedText(t => t + '\n')
    } else if (key.value === 'CLEAR') {
      setTypedText('')
    } else {
      setTypedText(t => t + key.value)
    }
  }, [])

  // ── Main render loop ────────────────────────────────────────────────────
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

      const ctx  = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      const keys = buildKeys()
      const now  = performance.now()

      // Get index fingertip position from first detected hand
      let fingerPos = null
      for (const hand of hands) {
        fingerPos = getIndexTipPosition(hand.landmarks, W, H)
        break
      }

      // ── Find which key the finger is over ────────────────────────────
      let hovering = null
      if (fingerPos) {
        for (const key of keys) {
          if (
            fingerPos.x >= key.x &&
            fingerPos.x <= key.x + key.w &&
            fingerPos.y >= key.y &&
            fingerPos.y <= key.y + key.h
          ) {
            hovering = key
            break
          }
        }
      }

      // ── Dwell tracking ────────────────────────────────────────────────
      if (hovering) {
        if (dwellRef.current.key?.value !== hovering.value) {
          // Moved to a new key — reset dwell timer
          dwellRef.current = { key: hovering, startTime: now, progress: 0 }
          lastTriggerRef.current = null
        } else {
          // Same key — accumulate dwell time
          const elapsed  = now - dwellRef.current.startTime
          const progress = Math.min(elapsed / DWELL_MS, 1)
          dwellRef.current.progress = progress

          // Trigger keypress when dwell complete
          if (progress >= 1 && lastTriggerRef.current !== hovering.value) {
            lastTriggerRef.current = hovering.value
            handleKeyPress(hovering)
            // Reset dwell so user can press same key again after moving away
            dwellRef.current = { key: hovering, startTime: now + 400, progress: 0 }
          }

          setDwellProgress(progress)
        }
        setHoveredKey(hovering.value)
      } else {
        // Not hovering anything — reset
        if (dwellRef.current.key) {
          dwellRef.current = { key: null, startTime: null, progress: 0 }
          lastTriggerRef.current = null
        }
        setHoveredKey(null)
        setDwellProgress(0)
      }

      // ── Draw all keys ─────────────────────────────────────────────────
      keys.forEach(key => {
        const isHovered  = hovering?.value === key.value
        const progress   = isHovered ? dwellRef.current.progress : 0
        const isComplete = progress >= 1

        ctx.save()

        // Key background
        const alpha = isHovered ? 0.85 : 0.4
        ctx.fillStyle = isComplete
          ? 'rgba(52,211,153,0.9)'
          : isHovered
          ? `rgba(167,139,250,${alpha})`
          : 'rgba(255,255,255,0.08)'

        ctx.strokeStyle = isHovered
          ? isComplete ? '#34d399' : '#a78bfa'
          : 'rgba(255,255,255,0.15)'
        ctx.lineWidth   = isHovered ? 2 : 1

        // Rounded rectangle
        const r = 8
        ctx.beginPath()
        ctx.moveTo(key.x + r, key.y)
        ctx.lineTo(key.x + key.w - r, key.y)
        ctx.arcTo(key.x + key.w, key.y, key.x + key.w, key.y + r, r)
        ctx.lineTo(key.x + key.w, key.y + key.h - r)
        ctx.arcTo(key.x + key.w, key.y + key.h, key.x + key.w - r, key.y + key.h, r)
        ctx.lineTo(key.x + r, key.y + key.h)
        ctx.arcTo(key.x, key.y + key.h, key.x, key.y + key.h - r, r)
        ctx.lineTo(key.x, key.y + r)
        ctx.arcTo(key.x, key.y, key.x + r, key.y, r)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Dwell progress arc on hovered key
        if (isHovered && progress > 0 && !isComplete) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth   = 3
          ctx.shadowColor = '#a78bfa'
          ctx.shadowBlur  = 8
          const cx = key.x + key.w / 2
          const cy = key.y + key.h / 2
          const r2 = Math.min(key.w, key.h) / 2 - 4
          ctx.beginPath()
          ctx.arc(cx, cy, r2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
          ctx.stroke()
        }

        // Key label
        ctx.fillStyle   = isHovered ? '#ffffff' : 'rgba(255,255,255,0.7)'
        ctx.font        = `${isHovered ? 'bold ' : ''}${key.value.length > 1 ? '16' : '18'}px Inter, system-ui, sans-serif`
        ctx.textAlign   = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowBlur  = isHovered ? 8 : 0
        ctx.shadowColor = '#a78bfa'
        ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h / 2)

        ctx.restore()
      })

      // ── Draw fingertip cursor ─────────────────────────────────────────
      if (fingerPos) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(fingerPos.x, fingerPos.y, 8, 0, Math.PI * 2)
        ctx.fillStyle   = hovering ? '#a78bfa' : 'rgba(255,255,255,0.6)'
        ctx.shadowColor = hovering ? '#a78bfa' : '#ffffff'
        ctx.shadowBlur  = 12
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [isActive, handsRef, buildKeys, handleKeyPress])

  return (
    <div className="absolute inset-0 z-40">
      {/* Canvas for keyboard and cursor */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <span className="text-white/70 font-bold tracking-wide text-sm">⌨️ Air Keyboard</span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          ✕ Exit Keyboard
        </button>
      </div>

      {/* Typed text display */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10">
        <div
          className="rounded-2xl px-6 py-4 min-h-[70px] text-2xl font-mono tracking-wide flex items-center flex-wrap"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {typedText
            ? <span style={{ whiteSpace: 'pre-wrap' }}>{typedText}</span>
            : <span style={{ color: 'rgba(255,255,255,0.2)' }}>Hover over keys to type...</span>
          }
          <span className="inline-block w-0.5 h-6 bg-white/40 ml-1 animate-pulse" />
        </div>
      </div>

      {/* Hover hint */}
      <div className="absolute z-10 pointer-events-none"
        style={{ bottom: `${window.innerHeight * 0.42 + 8}px`, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
      >
        <p className="text-white/20 text-xs">
          Hover a key and hold for {DWELL_MS / 1000}s to type · Point index finger at keys
        </p>
      </div>
    </div>
  )
}