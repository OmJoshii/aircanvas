import { useState } from 'react'
import CameraView from './components/CameraView'

export default function App() {
  const [started, setStarted] = useState(false)

  return (
    <>
      {/* Camera view — only mounts when started */}
      {started && (
        <CameraView isActive={started}>

          {/* HUD — top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-white font-bold text-lg tracking-wide">
                ✦ Air Canvas
              </h1>
              <p className="text-white/30 text-xs mt-0.5">
                Hand tracking loading...
              </p>
            </div>

            {/* Stop button */}
            <button
              onClick={() => setStarted(false)}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white/70 text-sm px-4 py-2 rounded-full transition-all"
            >
              ✕ Exit
            </button>
          </div>

          {/* Center placeholder */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/20 text-sm">
              Canvas and hand tracking coming soon...
            </p>
          </div>

        </CameraView>
      )}

      {/* Welcome screen — shown when not started */}
      {!started && (
        <div className="w-screen h-screen bg-[#07070f] flex items-center justify-center relative overflow-hidden">

          {/* Ambient glows */}
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
            <div className="text-7xl mb-6 select-none">✦</div>
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
              Air Canvas
            </h1>
            <p className="text-white/50 text-lg mb-10">
              Draw glowing art in the air using your hands
            </p>

            <div className="grid grid-cols-2 gap-3 mb-10">
              {[
                { icon: '🤏', text: 'Pinch to draw'              },
                { icon: '✊', text: 'Fist to erase'              },
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

        </div>
      )}
    </>
  )
}