import { useState, useEffect } from 'react'
import AirCanvas from './components/AirCanvas'

const gestures = [
  {
    icon: '🤏',
    label: 'Pinch to Draw',
    desc: 'Touch index finger and thumb together to paint',
    accent: '#818cf8',
    glow: 'rgba(129,140,248,0.4)',
  },
  {
    icon: '✊',
    label: 'Fist to Erase',
    desc: 'Curl all fingers into a fist to erase',
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.4)',
  },
  {
    icon: '🖐️',
    label: 'Both Palms — Clear',
    desc: 'Open both hands flat to wipe the canvas',
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.4)',
  },
  {
    icon: '👐',
    label: 'Distance = Brush',
    desc: 'Spread hands apart to grow your brush size',
    accent: '#fbbf24',
    glow: 'rgba(251,191,36,0.4)',
  },
]

export default function App() {
  const [started, setStarted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  if (started) return <AirCanvas onExit={() => setStarted(false)} />

  return (
    <div className="w-screen h-screen bg-[#050508] relative overflow-hidden flex items-center justify-center">

      {/* ── Deep space background ── */}
      <div className="absolute inset-0">
        {/* Primary atmospheric glow */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(236,72,153,0.10) 0%, transparent 60%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 100% 40% at 50% 100%, rgba(167,139,250,0.08) 0%, transparent 50%)' }} />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }} />
      </div>

      {/* ── Floating orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '8%',  left: '12%', size: 320, color: '#6366f1', opacity: 0.06 },
          { top: '60%', left: '75%', size: 400, color: '#ec4899', opacity: 0.06 },
          { top: '30%', left: '60%', size: 200, color: '#a78bfa', opacity: 0.05 },
          { top: '75%', left: '20%', size: 250, color: '#34d399', opacity: 0.04 },
        ].map((orb, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              top: orb.top, left: orb.left,
              width: orb.size, height: orb.size,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              opacity: orb.opacity,
              transform: 'translate(-50%, -50%)',
              filter: 'blur(40px)',
            }} />
        ))}

        {/* Floating micro dots */}
        {[
          { top: '15%', left: '22%',  size: 3, color: '#818cf8' },
          { top: '28%', left: '85%',  size: 2, color: '#f472b6' },
          { top: '72%', left: '8%',   size: 2, color: '#34d399' },
          { top: '82%', left: '88%',  size: 3, color: '#fbbf24' },
          { top: '45%', left: '5%',   size: 1.5, color: '#a78bfa' },
          { top: '18%', left: '55%',  size: 1.5, color: '#f472b6' },
          { top: '90%', left: '42%',  size: 2, color: '#818cf8' },
          { top: '55%', left: '92%',  size: 1.5, color: '#34d399' },
          { top: '38%', left: '48%',  size: 1, color: '#ffffff' },
          { top: '65%', left: '33%',  size: 1, color: '#ffffff' },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              top: dot.top, left: dot.left,
              width: dot.size * 2, height: dot.size * 2,
              background: dot.color,
              opacity: 0.6,
              boxShadow: `0 0 ${dot.size * 5}px ${dot.color}`,
            }} />
        ))}
      </div>

      {/* ── Main content ── */}
      <div
        className="relative z-10 w-full max-w-6xl mx-auto px-12 flex items-center gap-20 transition-all duration-700"
        style={{
          opacity:   mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        }}
      >

        {/* LEFT — Hero */}
        <div className="flex-1 flex flex-col items-start">

          {/* Badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
              border: '1px solid rgba(129,140,248,0.3)',
              color: '#a78bfa',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }}
            />
            Gesture — Powered Art
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1
              className="font-black leading-none tracking-tighter"
              style={{
                fontSize: 'clamp(60px, 8vw, 96px)',
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Air
            </h1>
            <h1
              className="font-black leading-none tracking-tighter"
              style={{
                fontSize: 'clamp(60px, 8vw, 96px)',
                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 40px rgba(129,140,248,0.4))',
              }}
            >
              Canvas
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-white/40 leading-relaxed mb-10 max-w-sm"
            style={{ fontSize: '1.05rem' }}>
            Draw glowing art in the air using nothing but your hands.
            No touch, no stylus, no mouse required.
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 mb-10">
            {[
              { value: '9',      label: 'Brush Styles' },
              { value: '60fps',  label: 'Real-time' },
              { value: '2',      label: 'Hands tracked' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col">
                <span
                  className="font-bold text-xl"
                  style={{
                    background: 'linear-gradient(135deg, #818cf8, #f472b6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stat.value}
                </span>
                <span className="text-white/30 text-xs">{stat.label}</span>
              </div>
            ))}
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">Live & Free</span>
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={() => setStarted(true)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-lg overflow-hidden transition-all duration-300"
            style={{
              background: hovered
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed, #be185d)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
              boxShadow: hovered
                ? '0 0 60px rgba(99,102,241,0.6), 0 0 100px rgba(236,72,153,0.3), 0 20px 40px rgba(0,0,0,0.5)'
                : '0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(236,72,153,0.15), 0 10px 30px rgba(0,0,0,0.4)',
              transform: hovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
              }}
            />
            <span>Start Drawing</span>
            <span
              className="transition-transform duration-300"
              style={{ transform: hovered ? 'translateX(6px)' : 'translateX(0)' }}
            >
              →
            </span>
          </button>

          <p className="text-white/20 text-xs mt-4 tracking-wide">
            Camera permission will be requested
          </p>
        </div>

        {/* RIGHT — Gesture cards */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {gestures.map((g, i) => (
            <div
              key={g.label}
              className="group relative rounded-2xl p-5 cursor-default overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${g.accent}0f 0%, ${g.accent}06 100%)`,
                border: `1px solid ${g.accent}25`,
                boxShadow: `0 4px 24px ${g.accent}08`,
              }}
            >
              {/* Corner glow */}
              <div
                className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle, ${g.accent}30, transparent 70%)`,
                  filter: 'blur(10px)',
                }}
              />

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 relative"
                style={{
                  background: `linear-gradient(135deg, ${g.accent}20, ${g.accent}10)`,
                  border: `1px solid ${g.accent}30`,
                  boxShadow: `0 0 20px ${g.accent}15`,
                }}
              >
                {g.icon}
              </div>

              {/* Text */}
              <p className="text-white/90 text-sm font-semibold mb-1.5 leading-snug">
                {g.label}
              </p>
              <p className="text-white/35 text-xs leading-relaxed">
                {g.desc}
              </p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, transparent, ${g.accent}60, transparent)`,
                }}
              />
            </div>
          ))}
        </div>

      </div>

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.2), rgba(244,114,182,0.2), transparent)' }}
        />
        <div className="flex items-center justify-center py-4">
          <p className="text-white/12 text-xs tracking-[0.25em] uppercase">
            Air Canvas &nbsp;·&nbsp; Built with MediaPipe &amp; React &nbsp;·&nbsp; Open your camera to begin
          </p>
        </div>
      </div>

    </div>
  )
}