import { useState, useEffect, useRef } from 'react'
import AirCanvas from './components/AirCanvas'

// ── Self-drawing animated background canvas ────────────────────────────────
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

// ── Main welcome screen ────────────────────────────────────────────────────
export default function App() {
  const [started,  setStarted]  = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true),  100)
    const t2 = setTimeout(() => setRevealed(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (started) return <AirCanvas onExit={() => setStarted(false)} />

  return (
    <div className="w-screen h-screen bg-[#030305] relative overflow-hidden">

      {/* ── Live animated canvas background ── */}
      <LiveBackground />

      {/* ── Dark center vignette to make text readable ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 55% 70% at 50% 50%,
              rgba(3,3,5,0.75) 0%,
              rgba(3,3,5,0.3) 60%,
              transparent 100%)
          `
        }}
      />

      {/* ── Ghost DRAW text behind everything ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{
          opacity:    mounted ? 0.03 : 0,
          transition: 'opacity 2s ease',
        }}
      >
        <span
          className="font-black tracking-tighter"
          style={{
            fontSize:       'clamp(160px, 22vw, 320px)',
            color:          'transparent',
            WebkitTextStroke: '2px rgba(255,255,255,1)',
            lineHeight:     1,
          }}
        >
          DRAW
        </span>
      </div>

      {/* ── Center content ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">

        {/* Badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase transition-all duration-700"
          style={{
            opacity:   revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(12px)',
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.1)',
            color:      'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }}
          />
          Gesture · Powered · Art
        </div>

        {/* Main title */}
        <div
          className="text-center mb-6 transition-all duration-700"
          style={{
            opacity:         revealed ? 1 : 0,
            transform:       revealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
            transitionDelay: '100ms',
          }}
        >
          <h1
            className="font-black leading-none tracking-tighter block"
            style={{
              fontSize: 'clamp(64px, 9vw, 120px)',
              color: '#ffffff',
              textShadow: '0 0 80px rgba(255,255,255,0.15)',
            }}
          >
            Air
          </h1>
          <h1
            className="font-black leading-none tracking-tighter block"
            style={{
              fontSize: 'clamp(64px, 9vw, 120px)',
              background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #e879f9 60%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              filter: 'drop-shadow(0 0 40px rgba(129,140,248,0.5))',
            }}
          >
            Canvas
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="text-center text-white/40 mb-12 max-w-xs leading-relaxed transition-all duration-700"
          style={{
            fontSize:        '1rem',
            opacity:         revealed ? 1 : 0,
            transform:       revealed ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '200ms',
          }}
        >
          Paint with your bare hands.<br />
          No touch required.
        </p>

        {/* CTA button */}
        <div
          className="transition-all duration-700"
          style={{
            opacity:         revealed ? 1 : 0,
            transform:       revealed ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '300ms',
          }}
        >
          <button
            onClick={() => setStarted(true)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative group overflow-hidden rounded-2xl font-bold text-white text-lg transition-all duration-300"
            style={{
              padding: '18px 56px',
              background: hovered
                ? 'linear-gradient(135deg, #4338ca, #7c3aed, #be185d)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              boxShadow: hovered
                ? '0 0 80px rgba(99,102,241,0.7), 0 0 120px rgba(236,72,153,0.4), 0 20px 60px rgba(0,0,0,0.6)'
                : '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(236,72,153,0.2), 0 10px 40px rgba(0,0,0,0.5)',
              transform: hovered ? 'translateY(-4px) scale(1.04)' : 'translateY(0) scale(1)',
              letterSpacing: '0.02em',
            }}
          >
            {/* Animated shimmer */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)',
                animation: hovered ? 'shimmer 0.6s ease' : 'none',
              }}
            />
            <span className="relative z-10 flex items-center gap-3">
              <span>Start Drawing</span>
              <span
                className="text-xl transition-transform duration-300"
                style={{ transform: hovered ? 'translateX(6px)' : 'translateX(0)' }}
              >
                →
              </span>
            </span>
          </button>

          <p className="text-center text-white/18 text-xs mt-4 tracking-wide">
            Camera access required · Works in Chrome &amp; Edge
          </p>
        </div>

      </div>

      {/* ── Gesture hints — bottom strip ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-700"
        style={{
          opacity:         revealed ? 1 : 0,
          transitionDelay: '500ms',
        }}
      >
        {/* Divider line */}
        <div
          className="h-px mx-8 mb-4"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3), rgba(244,114,182,0.3), transparent)',
          }}
        />

        <div className="flex items-center justify-center gap-8 pb-6">
          {[
            { icon: '🤏', label: 'Pinch — Draw',    color: '#818cf8' },
            { icon: '✊', label: 'Fist — Erase',    color: '#f472b6' },
            { icon: '🖐️', label: 'Palms — Clear',  color: '#34d399' },
            { icon: '👐', label: 'Spread — Resize', color: '#fbbf24' },
            { icon: '✌️✌️', label: 'Peace — Brush', color: '#a78bfa' },
          ].map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-base" style={{ filter: `drop-shadow(0 0 4px ${g.color})` }}>
                {g.icon}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {g.label}
              </span>
              {i < 4 && (
                <div className="w-px h-3 ml-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Top corner watermark ── */}
      <div
        className="absolute top-6 right-6 z-10 transition-all duration-700"
        style={{
          opacity:         revealed ? 1 : 0,
          transitionDelay: '700ms',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background:  'linear-gradient(135deg, #6366f1, #ec4899)',
              boxShadow:   '0 0 10px rgba(99,102,241,0.4)',
            }}
          >
            ✦
          </div>
          <span className="text-white/20 text-xs font-medium tracking-widest uppercase">
            Air Canvas
          </span>
        </div>
      </div>

    </div>
  )
}