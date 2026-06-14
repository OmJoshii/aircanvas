import { useState } from 'react'

export default function App() {
  const [started, setStarted] = useState(false)

  return (
    <div className="w-screen h-screen bg-[#07070f] flex items-center justify-center relative overflow-hidden">

      {/* Ambient background glow — purely aesthetic */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f472b6, transparent)' }}
        />
      </div>

      {/* Welcome card */}
      <div className="relative z-10 text-center max-w-lg px-6">

        {/* Logo */}
        <div className="text-7xl mb-6 select-none">✦</div>

        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          Air Canvas
        </h1>
        <p className="text-white/50 text-lg mb-10">
          Draw glowing art in the air using your hands
        </p>

        {/* Gesture hints */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {[
            { icon: '🤏', text: 'Pinch to draw' },
            { icon: '✊', text: 'Fist to erase' },
            { icon: '🖐🖐', text: 'Both palms open to clear' },
            { icon: '👐', text: 'Hand distance = brush size' },
          ].map(item => (
            <div
              key={item.text}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white/60 text-sm text-left">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={() => setStarted(true)}
          className="bg-white text-gray-900 font-bold text-lg px-12 py-4 rounded-full hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
        >
          Start Drawing
        </button>

        <p className="text-white/20 text-xs mt-6">
          Camera access required
        </p>

      </div>

      {/* Started state placeholder */}
      {started && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <p className="text-white/50 text-lg">
            Canvas coming in Phase 2...
          </p>
        </div>
      )}

    </div>
  )
}