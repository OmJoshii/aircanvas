import { useState } from 'react'
import CameraView from './components/CameraView'

const gestures = [
  {
    icon: '🤏',
    label: 'Pinch to Draw',
    desc: 'Touch index finger and thumb',
    accent: '#818cf8',
  },
  {
    icon: '✊',
    label: 'Fist to Erase',
    desc: 'Curl all fingers into a fist',
    accent: '#f472b6',
  },
  {
    icon: '🖐️',
    label: 'Both Palms — Clear',
    desc: 'Open both hands to wipe canvas',
    accent: '#34d399',
  },
  {
    icon: '👐',
    label: 'Distance = Brush Size',
    desc: 'Spread hands to grow brush',
    accent: '#fbbf24',
  },
]

export default function App() {
  const [started, setStarted] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <>
      {started && (
        <CameraView isActive={started}>
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
            <h1 className="text-white font-bold text-lg tracking-wide">✦ Air Canvas</h1>
            <button
              onClick={() => setStarted(false)}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white/70 text-sm px-4 py-2 rounded-full transition-all"
            >
              ✕ Exit
            </button>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/20 text-sm">Canvas coming in Phase 3...</p>
          </div>
        </CameraView>
      )}

      {!started && (
        <div className="w-screen h-screen bg-[#07070f] relative overflow-hidden flex items-center justify-center">

          {/* ── Background atmosphere ── */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top left purple */}
            <div className="absolute top-0 left-0 w-[45vw] h-[45vh]"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(129,140,248,0.18) 0%, transparent 70%)' }} />
            {/* Bottom right pink */}
            <div className="absolute bottom-0 right-0 w-[45vw] h-[45vh]"
              style={{ background: 'radial-gradient(ellipse at bottom right, rgba(244,114,182,0.18) 0%, transparent 70%)' }} />
            {/* Center subtle glow */}
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.05) 0%, transparent 60%)' }} />
          </div>

          {/* ── Decorative floating dots ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { top: '15%', left: '8%',  size: 3, color: '#818cf8', opacity: 0.5 },
              { top: '25%', left: '88%', size: 2, color: '#f472b6', opacity: 0.4 },
              { top: '70%', left: '5%',  size: 2, color: '#34d399', opacity: 0.4 },
              { top: '80%', left: '92%', size: 3, color: '#fbbf24', opacity: 0.4 },
              { top: '45%', left: '3%',  size: 1.5, color: '#f472b6', opacity: 0.3 },
              { top: '55%', left: '95%', size: 1.5, color: '#818cf8', opacity: 0.3 },
              { top: '10%', left: '50%', size: 2, color: '#a78bfa', opacity: 0.3 },
              { top: '90%', left: '45%', size: 2, color: '#f472b6', opacity: 0.3 },
            ].map((dot, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  top: dot.top, left: dot.left,
                  width: dot.size * 2, height: dot.size * 2,
                  background: dot.color,
                  opacity: dot.opacity,
                  boxShadow: `0 0 ${dot.size * 6}px ${dot.color}`,
                }}
              />
            ))}
          </div>

          {/* ── Main layout ── */}
          <div className="relative z-10 w-full max-w-5xl mx-auto px-10 flex items-center gap-16">

            {/* LEFT — Branding */}
            <div className="flex-1 flex flex-col items-start">

              {/* Badge */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-medium"
                style={{
                  background: 'rgba(129,140,248,0.12)',
                  border: '1px solid rgba(129,140,248,0.3)',
                  color: '#a78bfa',
                }}
              >
                <span>✦</span>
                <span>Gesture — Powered Art</span>
              </div>

              {/* Title */}
              <h1
                className="text-7xl font-bold leading-none tracking-tight mb-5"
                style={{
                  background: 'linear-gradient(160deg, #ffffff 0%, rgba(255,255,255,0.4) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Air<br />Canvas
              </h1>

              {/* Subtitle */}
              <p className="text-white/40 text-base leading-relaxed mb-10 max-w-xs">
                Draw glowing art in the air using nothing but your hands and a webcam. No touch required.
              </p>

              {/* CTA Button */}
              <button
                onClick={() => setStarted(true)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white text-base transition-all duration-300"
                style={{
                  background: hovered
                    ? 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)'
                    : 'linear-gradient(135deg, #818cf8, #a78bfa, #f472b6)',
                  boxShadow: hovered
                    ? '0 0 40px rgba(129,140,248,0.5), 0 0 80px rgba(244,114,182,0.25), 0 8px 32px rgba(0,0,0,0.4)'
                    : '0 0 25px rgba(129,140,248,0.3), 0 0 50px rgba(244,114,182,0.15), 0 8px 24px rgba(0,0,0,0.3)',
                  transform: hovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                }}
              >
                <span>Start Drawing</span>
                <span
                  className="transition-transform duration-300"
                  style={{ transform: hovered ? 'translateX(4px)' : 'translateX(0)' }}
                >
                  →
                </span>
              </button>

              <p className="text-white/20 text-xs mt-4">
                Camera permission will be requested on start
              </p>

            </div>

            {/* RIGHT — Gesture cards */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {gestures.map((g, i) => (
                <div
                  key={g.label}
                  className="flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-default"
                  style={{
                    background: `linear-gradient(135deg, ${g.accent}12, ${g.accent}06)`,
                    border: `1px solid ${g.accent}30`,
                    boxShadow: `0 4px 24px ${g.accent}08`,
                  }}
                >
                  {/* Icon with glow */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      background: `${g.accent}15`,
                      border: `1px solid ${g.accent}25`,
                      boxShadow: `0 0 16px ${g.accent}20`,
                    }}
                  >
                    {g.icon}
                  </div>

                  <div>
                    <p className="text-white/90 text-sm font-semibold mb-1">{g.label}</p>
                    <p className="text-white/35 text-xs leading-relaxed">{g.desc}</p>
                  </div>

                  {/* Accent line at bottom */}
                  <div
                    className="h-0.5 w-8 rounded-full mt-auto"
                    style={{ background: `linear-gradient(90deg, ${g.accent}, transparent)` }}
                  />
                </div>
              ))}
            </div>

          </div>

          {/* ── Bottom credit ── */}
          <div className="absolute bottom-5 left-0 right-0 flex justify-center">
            <p className="text-white/15 text-xs tracking-widest uppercase">
              Air Canvas · Built with MediaPipe & React
            </p>
          </div>

        </div>
      )}
    </>
  )
}