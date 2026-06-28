import { useState, useEffect, useRef } from 'react'
import AirCanvas from './components/AirCanvas'
import Scene3D from './components/Scene3D'

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

// ── Main welcome screen ────────────────────────────────────────────────────
export default function App() {
  const [started,      setStarted]      = useState(false)
  const [mounted,      setMounted]      = useState(false)
  const [hovered,      setHovered]      = useState(false)
  const [pressed,      setPressed]      = useState(false)
  const [revealed,     setRevealed]     = useState(false)
  const [webglOK,      setWebglOK]      = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hoverChip,    setHoverChip]    = useState(null)

  const stageRef  = useRef(null)
  const tiltFrame = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true),  100)
    const t2 = setTimeout(() => setRevealed(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Track the person's reduced-motion preference live, not just on load
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

  // Cursor-driven 3D tilt of the entire foreground stage — written directly
  // to the DOM (not React state) so it stays smooth at mouse-move frequency.
  // Skipped for touch devices and when reduced motion is requested.
  useEffect(() => {
    const canHover = typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (reducedMotion || !canHover) return undefined

    function handleMove(e) {
      if (tiltFrame.current) return
      tiltFrame.current = requestAnimationFrame(() => {
        tiltFrame.current = null
        const nx = (e.clientX / window.innerWidth) * 2 - 1
        const ny = (e.clientY / window.innerHeight) * 2 - 1
        const el = stageRef.current
        if (el) {
          el.style.transform = `rotateX(${(-ny * 5.5).toFixed(2)}deg) rotateY(${(nx * 7.5).toFixed(2)}deg)`
        }
      })
    }
    window.addEventListener('pointermove', handleMove)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      if (tiltFrame.current) cancelAnimationFrame(tiltFrame.current)
    }
  }, [reducedMotion])

  if (started) return <AirCanvas onExit={() => setStarted(false)} />

  const GESTURES = [
    { icon: '🤏', label: 'Pinch — Draw',    color: '129,140,248' },
    { icon: '✊', label: 'Fist — Erase',    color: '244,114,182' },
    { icon: '🖐️', label: 'Palms — Clear',  color: '52,211,153'  },
    { icon: '👐', label: 'Spread — Resize', color: '251,191,36'  },
    { icon: '✌️✌️', label: 'Peace — Brush', color: '167,139,250' },
  ]

  return (
    <div className="w-screen h-screen bg-[#030305] relative overflow-hidden">

      {/* ── Real 3D background: glowing ink-core + orbiting drawn light ── */}
      {webglOK ? (
        <Scene3D reducedMotion={reducedMotion} onUnsupported={() => setWebglOK(false)} />
      ) : (
        <LiveBackground />
      )}

      {/* ── Dark center vignette to make text readable ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 55% 70% at 50% 50%,
              rgba(3,3,5,0.72) 0%,
              rgba(3,3,5,0.28) 60%,
              transparent 100%)
          `
        }}
      />

      {/* ── 3D perspective stage — everything below tilts toward the cursor as one connected scene ── */}
      <div className="absolute inset-0" style={{ perspective: '1600px' }}>
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >

          {/* Ghost DRAW text, extruded behind everything */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ transform: 'translateZ(-100px)' }}
          >
            <div
              style={{
                position:   'relative',
                opacity:    mounted ? 1 : 0,
                transition: 'opacity 2s ease',
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="font-black tracking-tighter block"
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize:   'clamp(160px, 22vw, 320px)',
                    lineHeight: 1,
                    color:      `rgba(76,45,160,${0.07 - i * 0.009})`,
                    transform:  `translate(${i * 1.6}px, ${i * 1.6}px)`,
                  }}
                >
                  DRAW
                </span>
              ))}
              <span
                className="font-black tracking-tighter block"
                style={{
                  position:   'relative',
                  fontFamily: 'var(--font-display)',
                  fontSize:   'clamp(160px, 22vw, 320px)',
                  lineHeight: 1,
                  color:      'transparent',
                  WebkitTextStroke: '2px rgba(255,255,255,1)',
                }}
              >
                DRAW
              </span>
            </div>
          </div>

          {/* Center content */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ transformStyle: 'preserve-3d' }}
          >

            {/* Badge */}
            <div
              style={{
                transformStyle: 'preserve-3d',
                animation: reducedMotion ? 'none' : 'gentleFloat 7s ease-in-out infinite',
                animationDelay: '0s',
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity:    revealed ? 1 : 0,
                  transform:  `${revealed ? 'translateY(0)' : 'translateY(12px)'} translateZ(25px)`,
                  transition: 'opacity 0.7s ease, transform 0.7s ease',
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
            </div>

            {/* Main title */}
            <div
              style={{
                transformStyle: 'preserve-3d',
                animation: reducedMotion ? 'none' : 'gentleFloat 7s ease-in-out infinite',
                animationDelay: '-2.3s',
              }}
            >
              <div
                className="text-center mb-6"
                style={{
                  opacity:         revealed ? 1 : 0,
                  transform:       `${revealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)'} translateZ(60px)`,
                  transition:      'opacity 0.7s ease, transform 0.7s ease',
                  transitionDelay: '100ms',
                }}
              >
                <h1
                  className="leading-none tracking-tighter block"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize:   'clamp(56px, 8vw, 108px)',
                    color:      '#ffffff',
                    textShadow: '0 0 80px rgba(255,255,255,0.15)',
                  }}
                >
                  Air
                </h1>
                <h1
                  className="leading-none tracking-tighter block"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize:   'clamp(56px, 8vw, 108px)',
                    background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #e879f9 60%, #f472b6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor:  'transparent',
                    filter: 'drop-shadow(0 0 40px rgba(129,140,248,0.5))',
                  }}
                >
                  Canvas
                </h1>
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                transformStyle: 'preserve-3d',
                animation: reducedMotion ? 'none' : 'gentleFloat 7s ease-in-out infinite',
                animationDelay: '-4.6s',
              }}
            >
              <p
                className="text-center text-white/40 mb-12 max-w-xs leading-relaxed"
                style={{
                  fontFamily:      'var(--font-body)',
                  fontSize:        '1rem',
                  opacity:         revealed ? 1 : 0,
                  transform:       `${revealed ? 'translateY(0)' : 'translateY(12px)'} translateZ(30px)`,
                  transition:      'opacity 0.7s ease, transform 0.7s ease',
                  transitionDelay: '200ms',
                }}
              >
                Paint with your bare hands.<br />
                No touch required.
              </p>
            </div>

            {/* CTA button — a genuinely extruded 3D object, not a flat rectangle */}
            <div
              style={{
                transformStyle: 'preserve-3d',
                animation: reducedMotion ? 'none' : 'gentleFloat 7s ease-in-out infinite',
                animationDelay: '-1.1s',
              }}
            >
              <div
                style={{
                  opacity:         revealed ? 1 : 0,
                  transform:       `${revealed ? 'translateY(0)' : 'translateY(12px)'} translateZ(85px)`,
                  transition:      'opacity 0.7s ease, transform 0.7s ease',
                  transitionDelay: '300ms',
                }}
              >
                <div style={{ position: 'relative', perspective: '500px' }}>

                  {/* Contact shadow — sells the "floating object" illusion */}
                  <div
                    style={{
                      position:  'absolute',
                      left:      '50%',
                      bottom:    pressed ? '-2px' : hovered ? '-14px' : '-8px',
                      width:     '72%',
                      height:    '16px',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.55)',
                      borderRadius: '50%',
                      filter:    'blur(10px)',
                      opacity:   pressed ? 0.55 : hovered ? 0.3 : 0.45,
                      transition: 'all 0.25s ease',
                    }}
                  />

                  <button
                    onClick={() => setStarted(true)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => { setHovered(false); setPressed(false) }}
                    onMouseDown={() => setPressed(true)}
                    onMouseUp={() => setPressed(false)}
                    onTouchStart={() => setPressed(true)}
                    onTouchEnd={() => setPressed(false)}
                    className="relative group block font-bold text-white text-lg"
                    style={{
                      fontFamily: 'var(--font-display)',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      borderRadius: '20px',
                      transformStyle: 'preserve-3d',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {/* Base/side face — the "block" the front face floats above */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        background: 'linear-gradient(135deg, #2e1065, #500724)',
                        transform: 'translateZ(0px) translateY(5px)',
                      }}
                    />

                    {/* Front face — lifts on hover, presses down on click */}
                    <span
                      className="relative overflow-hidden flex items-center gap-3"
                      style={{
                        borderRadius: 'inherit',
                        padding: '18px 56px',
                        background: hovered
                          ? 'linear-gradient(135deg, #4338ca, #7c3aed, #be185d)'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                        boxShadow: hovered
                          ? '0 0 80px rgba(99,102,241,0.7), 0 0 120px rgba(236,72,153,0.4)'
                          : '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(236,72,153,0.2)',
                        transform: `translateZ(${pressed ? 2 : hovered ? 16 : 8}px)`,
                        transition: 'transform 0.18s ease, background 0.3s ease, box-shadow 0.3s ease',
                      }}
                    >
                      {/* Shimmer sweep */}
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.14) 50%, transparent 75%)',
                          animation: hovered ? 'shimmer 0.6s ease' : 'none',
                          transition: 'opacity 0.5s ease',
                        }}
                      />
                      <span className="relative z-10 flex items-center gap-3">
                        <span>Start Drawing</span>
                        <span
                          className="text-xl"
                          style={{
                            transform: hovered ? 'translateX(6px)' : 'translateX(0)',
                            transition: 'transform 0.3s ease',
                            display: 'inline-block',
                          }}
                        >
                          →
                        </span>
                      </span>
                    </span>
                  </button>
                </div>

                <p
                  className="text-center text-white/18 text-xs mt-4 tracking-wide"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Camera access required · Works in Chrome &amp; Edge
                </p>
              </div>
            </div>

          </div>

          {/* ── Gesture hints — bottom strip, floating glass chips ── */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10"
            style={{
              opacity:         revealed ? 1 : 0,
              transform:       'translateZ(20px)',
              transition:      'opacity 0.7s ease',
              transitionDelay: '500ms',
            }}
          >
            <div
              className="h-px mx-8 mb-4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3), rgba(244,114,182,0.3), transparent)',
              }}
            />

            <div className="flex items-center justify-center gap-3 pb-6 flex-wrap px-4">
              {GESTURES.map((g, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoverChip(i)}
                  onMouseLeave={() => setHoverChip(null)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    fontFamily: 'var(--font-body)',
                    background: `rgba(${g.color}, ${hoverChip === i ? 0.12 : 0.05})`,
                    border:     `1px solid rgba(${g.color}, ${hoverChip === i ? 0.4 : 0.16})`,
                    transform:  hoverChip === i ? 'translateY(-3px)' : 'translateY(0)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <span className="text-base" style={{ filter: `drop-shadow(0 0 4px rgb(${g.color}))` }}>
                    {g.icon}
                  </span>
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{ color: hoverChip === i ? `rgb(${g.color})` : 'rgba(255,255,255,0.4)' }}
                  >
                    {g.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Top corner watermark ── */}
          <div
            className="absolute top-6 right-6 z-10"
            style={{
              opacity:         revealed ? 1 : 0,
              transform:       'translateZ(20px)',
              transition:      'opacity 0.7s ease',
              transitionDelay: '700ms',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                  boxShadow:  '0 0 10px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
                }}
              >
                ✦
              </div>
              <span
                className="text-white/20 text-xs font-medium tracking-widest uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Air Canvas
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}