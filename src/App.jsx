import { useState, useEffect, useRef } from 'react'
import AirCanvas from './components/AirCanvas'
import Scene3D from './components/Scene3D'
import SDKDemo from './components/SDKDemo'

// ── Self-drawing animated background canvas (fallback when WebGL is unavailable) ──
function LiveBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx    = canvas.getContext('2d')
    let   animId = null
    let   frame  = 0

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Define pre-scripted stroke paths that animate drawing themselves
    // Each stroke is a set of control points for a bezier curve
    const strokes = [
      {
        points: [
          { x: 0.08, y: 0.55 }, { x: 0.18, y: 0.25 }, { x: 0.28, y: 0.70 },
          { x: 0.38, y: 0.20 }, { x: 0.48, y: 0.65 },
        ],
        color:  { r: 129, g: 140, b: 248 }, // indigo
        width:  3,
        speed:  0.003,
        offset: 0,
        glow:   20,
      },
      {
        points: [
          { x: 0.15, y: 0.80 }, { x: 0.30, y: 0.60 }, { x: 0.45, y: 0.85 },
          { x: 0.55, y: 0.50 }, { x: 0.70, y: 0.75 },
        ],
        color:  { r: 244, g: 114, b: 182 }, // pink
        width:  2.5,
        speed:  0.0025,
        offset: 0.3,
        glow:   18,
      },
      {
        points: [
          { x: 0.55, y: 0.15 }, { x: 0.65, y: 0.45 }, { x: 0.75, y: 0.20 },
          { x: 0.85, y: 0.55 }, { x: 0.92, y: 0.30 },
        ],
        color:  { r: 34, g: 211, b: 238 }, // cyan
        width:  2,
        speed:  0.002,
        offset: 0.6,
        glow:   16,
      },
      {
        points: [
          { x: 0.60, y: 0.70 }, { x: 0.70, y: 0.50 }, { x: 0.80, y: 0.80 },
          { x: 0.88, y: 0.60 }, { x: 0.95, y: 0.85 },
        ],
        color:  { r: 167, g: 139, b: 250 }, // violet
        width:  2.5,
        speed:  0.0022,
        offset: 0.15,
        glow:   18,
      },
      {
        points: [
          { x: 0.02, y: 0.30 }, { x: 0.12, y: 0.10 }, { x: 0.22, y: 0.40 },
          { x: 0.32, y: 0.08 },
        ],
        color:  { r: 52, g: 211, b: 153 }, // emerald
        width:  2,
        speed:  0.0018,
        offset: 0.45,
        glow:   14,
      },
    ]

    // Get interpolated point along a stroke at progress t (0-1)
    function getStrokePoint(stroke, t) {
      const pts  = stroke.points
      const idx  = t * (pts.length - 1)
      const low  = Math.floor(idx)
      const high = Math.min(low + 1, pts.length - 1)
      const frac = idx - low
      return {
        x: (pts[low].x + (pts[high].x - pts[low].x) * frac) * canvas.width,
        y: (pts[low].y + (pts[high].y - pts[low].y) * frac) * canvas.height,
      }
    }

    function loop() {
      frame++

      // Fade existing content slightly each frame — creates the trailing effect
      ctx.fillStyle = 'rgba(3,3,5,0.018)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      strokes.forEach((stroke, si) => {
        const progress = ((frame * stroke.speed + stroke.offset) % 1)
        const trailLen = 0.18  // how much of the stroke is visible at once

        // Draw the active tip of the stroke
        const segments = 40
        for (let i = 0; i < segments; i++) {
          const t0 = progress - trailLen + (i / segments) * trailLen
          const t1 = progress - trailLen + ((i + 1) / segments) * trailLen

          if (t0 < 0 || t1 < 0) continue
          if (t0 > 1 || t1 > 1) continue

          const p0 = getStrokePoint(stroke, Math.max(0, Math.min(1, t0)))
          const p1 = getStrokePoint(stroke, Math.max(0, Math.min(1, t1)))

          // Alpha fades at the tail
          const tailAlpha = i / segments
          const { r, g, b } = stroke.color

          ctx.save()
          ctx.globalAlpha  = tailAlpha * 0.7
          ctx.strokeStyle  = `rgb(${r},${g},${b})`
          ctx.lineWidth    = stroke.width
          ctx.lineCap      = 'round'
          ctx.shadowColor  = `rgb(${r},${g},${b})`
          ctx.shadowBlur   = stroke.glow * tailAlpha
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()

          // Bright white core at the tip
          if (i > segments * 0.85) {
            ctx.globalAlpha  = (i / segments - 0.85) / 0.15
            ctx.strokeStyle  = 'rgba(255,255,255,0.9)'
            ctx.lineWidth    = stroke.width * 0.3
            ctx.shadowBlur   = 6
            ctx.stroke()
          }

          ctx.restore()
        }

        // Sparkle at the very tip
        const tipT  = progress
        if (tipT >= 0 && tipT <= 1) {
          const tip = getStrokePoint(stroke, tipT)
          const { r, g, b } = stroke.color

          for (let s = 0; s < 2; s++) {
            const angle = Math.random() * Math.PI * 2
            const dist  = Math.random() * stroke.glow * 0.6
            const sx    = tip.x + Math.cos(angle) * dist
            const sy    = tip.y + Math.sin(angle) * dist
            const sz    = Math.random() * 1.5 + 0.3

            ctx.save()
            ctx.globalAlpha = Math.random() * 0.5 + 0.1
            ctx.fillStyle   = Math.random() > 0.5 ? `rgb(${r},${g},${b})` : '#ffffff'
            ctx.shadowColor = `rgb(${r},${g},${b})`
            ctx.shadowBlur  = sz * 4
            ctx.beginPath()
            ctx.arc(sx, sy, sz, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }
      })

      animId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  )
}

// ── Reusable corner bracket — draws itself in on mount, like a camera
//    acquiring focus. One path, mirrored into all four corners via rotation.
function CornerBracket({ corner, revealed }) {
  const pos = {
    'top-left':     { top: '24px',    left: '24px',   transform: 'rotate(0deg)'    },
    'top-right':    { top: '24px',    right: '24px',  transform: 'rotate(90deg)'   },
    'bottom-right': { bottom: '24px', right: '24px',  transform: 'rotate(180deg)'  },
    'bottom-left':  { bottom: '24px', left: '24px',   transform: 'rotate(270deg)'  },
  }[corner]

  return (
    <svg
      width="30" height="30" viewBox="0 0 30 30"
      style={{ position: 'absolute', ...pos }}
      aria-hidden="true"
    >
      <path
        d="M 1 29 L 1 1 L 29 1"
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.5"
        strokeDasharray="56"
        strokeDashoffset={revealed ? 0 : 56}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  )
}

// ── Main welcome screen ────────────────────────────────────────────────────
export default function App() {
  const [started,       setStarted]       = useState(false)
  const [revealed,      setRevealed]      = useState(false)
  const [webglOK,       setWebglOK]       = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hoverChip,     setHoverChip]     = useState(null)
  const [hoveredIris,   setHoveredIris]   = useState(false)
  const [clickPulse,    setClickPulse]    = useState(0)
  const [clock,         setClock]         = useState('')
  const [sdkDemoOpen, setSdkDemoOpen] = useState(false)

  const reticleRef = useRef(null)
  const rafRef      = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 250)
    return () => clearTimeout(t)
  }, [])

  // Live HUD clock — a real running instrument, not a static mock
  useEffect(() => {
    function tick() {
      const d = new Date()
      setClock(d.toTimeString().slice(0, 8))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Track reduced-motion preference live
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handle = (e) => setReducedMotion(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', handle)
    else mq.addListener(handle)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handle)
      else mq.removeListener(handle)
    }
  }, [])

  // Reticle that drifts toward the cursor — a focus point tracking attention,
  // not decoration. Skipped for touch devices and reduced motion.
  useEffect(() => {
    const canHover = typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (reducedMotion || !canHover) return undefined

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let cx = tx, cy = ty

    function handleMove(e) {
      tx = e.clientX
      ty = e.clientY
    }
    window.addEventListener('pointermove', handleMove)

    function loop() {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      const el = reticleRef.current
      if (el) el.style.transform = `translate(${cx - 14}px, ${cy - 14}px)`
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [reducedMotion])

  if (started) return <AirCanvas onExit={() => setStarted(false)} />
  if (sdkDemoOpen) return <SDKDemo onExit={() => setSdkDemoOpen(false)} />

  const GESTURES = [
    { n: '01', icon: '🤏', label: 'PINCH',  action: 'Draw',   color: '129,140,248' },
    { n: '02', icon: '✊', label: 'FIST',   action: 'Erase',  color: '244,114,182' },
    { n: '03', icon: '🖐️', label: 'PALM',   action: 'Clear',  color: '52,211,153'  },
    { n: '04', icon: '👐', label: 'SPREAD', action: 'Resize', color: '251,191,36'  },
    { n: '05', icon: '✌️✌️', label: 'PEACE',  action: 'Brush',  color: '167,139,250' },
  ]

  return (
    <div className="w-screen h-screen bg-[#030305] relative overflow-hidden scanlines">

      {/* ── Real 3D background: glowing ink-core + orbiting drawn light ── */}
      {webglOK ? (
        <Scene3D reducedMotion={reducedMotion} onUnsupported={() => setWebglOK(false)} />
      ) : (
        <LiveBackground />
      )}

      {/* ── Edge vignette — keeps HUD chrome legible without flattening the scene ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to top, rgba(3,3,5,0.75) 0%, rgba(3,3,5,0.15) 30%, transparent 55%),
            linear-gradient(to right, rgba(3,3,5,0.35) 0%, transparent 30%),
            radial-gradient(ellipse 80% 60% at 50% 50%, transparent 50%, rgba(3,3,5,0.4) 100%)
          `
        }}
      />

      {/* ── Corner brackets — focus-acquired framing ── */}
      <CornerBracket corner="top-left"     revealed={revealed} />
      <CornerBracket corner="top-right"    revealed={revealed} />
      <CornerBracket corner="bottom-left"  revealed={revealed} />
      <CornerBracket corner="bottom-right" revealed={revealed} />

      {/* ── Cursor reticle ── */}
      <div
        ref={reticleRef}
        className="absolute top-0 left-0 pointer-events-none hidden md:block"
        style={{ width: 28, height: 28, opacity: revealed ? 0.5 : 0, transition: 'opacity 0.8s ease' }}
        aria-hidden="true"
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="9" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <line x1="14" y1="0" x2="14" y2="6" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <line x1="14" y1="22" x2="14" y2="28" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <line x1="0" y1="14" x2="6" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <line x1="22" y1="14" x2="28" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        </svg>
      </div>

      {/* ── Top HUD bar ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#34d399', animation: reducedMotion ? 'none' : 'standbyPulse 2.2s ease-in-out infinite' }}
          />
          <span className="text-[10px] sm:text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            SYSTEM READY
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 text-[10px] sm:text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <span>{clock}</span>
          <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span className="hidden sm:inline">AIR.CANVAS / v2.4</span>
        </div>
      </div>

      {/* ── Right edge: gesture legend ── */}
      <div
        className="absolute right-10 top-1/2 hidden lg:flex flex-col gap-3"
        style={{
          transform: revealed ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(12px)',
          opacity: revealed ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
        }}
      >
        <span
          className="text-[10px] tracking-[0.25em] mb-1"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)' }}
        >
          CONTROLS
        </span>
        {GESTURES.map((g, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoverChip(i)}
            onMouseLeave={() => setHoverChip(null)}
            className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-lg"
            style={{
              background: `rgba(${g.color}, ${hoverChip === i ? 0.1 : 0.03})`,
              border: `1px solid rgba(${g.color}, ${hoverChip === i ? 0.45 : 0.12})`,
              transform: hoverChip === i ? 'translateX(-4px)' : 'translateX(0)',
              transition: 'all 0.25s ease',
              cursor: 'default',
            }}
          >
            <span
              className="text-[10px] tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: hoverChip === i ? `rgb(${g.color})` : 'rgba(255,255,255,0.25)' }}
            >
              {g.n}
            </span>
            <span className="text-base" style={{ filter: `drop-shadow(0 0 4px rgb(${g.color}))` }}>
              {g.icon}
            </span>
            <div className="flex flex-col leading-tight">
              <span
                className="text-[11px] font-semibold tracking-wide"
                style={{ fontFamily: 'var(--font-mono)', color: hoverChip === i ? `rgb(${g.color})` : 'rgba(255,255,255,0.55)' }}
              >
                {g.label}
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {g.action}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom-left: wordmark anchor (centered/stacked on mobile, corner-anchored on desktop) ── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-56 text-center px-6 md:left-14 md:translate-x-0 md:bottom-16 md:text-left md:px-0 max-w-md">
        <div
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
          }}
        >
          <h1
            className="leading-[0.92] tracking-tighter"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(44px, 7vw, 92px)', color: '#fff' }}
          >
            Air
          </h1>
          <h1
            className="leading-[0.92] tracking-tighter mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(44px, 7vw, 92px)',
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #e879f9 60%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 36px rgba(129,140,248,0.45))',
            }}
          >
            Canvas
          </h1>
          <p
            className="text-sm leading-relaxed mx-auto md:mx-0"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', maxWidth: '260px' }}
          >
            Paint with your bare hands. No touch, no stylus — just a webcam and a gesture.
          </p>
        </div>
      </div>

      {/* ── Bottom-right: the iris shutter control (centered on mobile, corner-anchored on desktop) ── */}
      <div className="absolute inset-x-0 bottom-8 flex flex-col items-center md:inset-x-auto md:right-14 md:bottom-16">
        <div
          className="flex flex-col items-center"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
          }}
        >
        <div className="relative w-[136px] h-[136px] md:w-[168px] md:h-[168px]">

          {/* Outer tick ring — static */}
          <svg viewBox="0 0 168 168" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <circle cx="84" cy="84" r="80" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="1.5 7" />
          </svg>

          {/* Rotating arc ring */}
          <svg
            viewBox="0 0 168 168"
            className="absolute inset-0 w-full h-full"
            style={{
              animation: reducedMotion ? 'none' : `spin ${hoveredIris ? 4 : 10}s linear infinite`,
              transition: 'animation-duration 0.3s ease',
            }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="irisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            <circle
              cx="84" cy="84" r="68" fill="none" stroke="url(#irisGrad)" strokeWidth="2"
              strokeDasharray="60 367" strokeLinecap="round"
              opacity={hoveredIris ? 1 : 0.6}
              style={{ transition: 'opacity 0.3s ease' }}
            />
          </svg>

          {/* Click flash */}
          {clickPulse > 0 && (
            <span
              key={clickPulse}
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: 8,
                background: 'radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)',
                animation: 'shutterFlash 0.45s ease-out forwards',
              }}
            />
          )}

          {/* Core button */}
          <button
            onClick={() => { setClickPulse(p => p + 1); setTimeout(() => setStarted(true), 180) }}
            onMouseEnter={() => setHoveredIris(true)}
            onMouseLeave={() => setHoveredIris(false)}
            className="absolute flex flex-col items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
            style={{
              inset: 20,
              border: 'none',
              cursor: 'pointer',
              background: hoveredIris
                ? 'linear-gradient(135deg, #4338ca, #7c3aed, #be185d)'
                : 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
              boxShadow: hoveredIris
                ? '0 0 60px rgba(124,58,237,0.65), 0 0 110px rgba(219,39,119,0.35)'
                : '0 0 28px rgba(124,58,237,0.4), 0 0 60px rgba(219,39,119,0.2)',
              transform: hoveredIris ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.25s ease, background 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            <span
              className="text-sm font-semibold tracking-[0.15em] text-white"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              START
            </span>
            <span
              className="text-lg text-white"
              style={{ transform: hoveredIris ? 'translate(2px,-2px)' : 'translate(0,0)', transition: 'transform 0.25s ease' }}
            >
              ↗
            </span>
          </button>
          
        </div>

        <p
          className="text-[11px] mt-4 tracking-widest text-center"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)' }}
        >
          CAMERA ACCESS REQUIRED
        </p>

        <button
          onClick={() => setSdkDemoOpen(true)}
          className="text-white/25 hover:text-white/50 text-xs mt-3 underline underline-offset-4 transition-colors"
        >
          Or try the GestureOS SDK demo →
        </button>
        </div>
      </div>

    </div>
  )
}