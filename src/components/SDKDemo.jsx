import { useState } from 'react'
import { useGestureOS } from '../sdk/useGestureOS'
import { useGestureTarget } from '../sdk/useGestureTarget'

function GestureButton({ label, color, onSelect, ready }) {
  const { elRef, hovered, progress } = useGestureTarget({ onSelect, dwellMs: 600, ready })

  return (
    <button
      ref={elRef}
      className="relative px-8 py-6 rounded-2xl font-semibold text-white text-lg overflow-hidden transition-transform duration-150"
      style={{
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `1px solid ${hovered ? color : color + '40'}`,
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {/* Dwell progress fill */}
      <div
        className="absolute inset-0 origin-left transition-none"
        style={{
          background: `${color}30`,
          transform: `scaleX(${progress})`,
        }}
      />
      <span className="relative z-10">{label}</span>
    </button>
  )
}

export default function SDKDemo({ onExit }) {
  const { videoRef, ready, cursor } = useGestureOS()
  const [log, setLog] = useState([])

  function addLog(msg) {
    setLog(l => [msg, ...l].slice(0, 6))
  }

  return (
    <div className="relative w-screen h-screen bg-[#050508] overflow-hidden">

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-25"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 z-10">

        <div className="text-center">
          <h1 className="text-white font-bold text-2xl mb-2">GestureOS SDK Demo</h1>
          <p className="text-white/40 text-sm">
            {ready ? 'Hover any button with your fingertip and hold to select' : 'Loading hand tracking...'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <GestureButton label="🏠 Home"     color="#818cf8" onSelect={() => addLog('Selected: Home')}     ready={ready} />
          <GestureButton label="⚙️ Settings" color="#34d399" onSelect={() => addLog('Selected: Settings')} ready={ready} />
          <GestureButton label="📁 Files"    color="#fbbf24" onSelect={() => addLog('Selected: Files')}    ready={ready} />
          <GestureButton label="🔔 Alerts"   color="#f472b6" onSelect={() => addLog('Selected: Alerts')}   ready={ready} />
          <GestureButton label="👤 Profile"  color="#a78bfa" onSelect={() => addLog('Selected: Profile')}  ready={ready} />
          <GestureButton label="🚪 Exit"     color="#ef4444" onSelect={onExit}                              ready={ready} />
        </div>

        {/* Event log proving it's wired up to real DOM elements */}
        <div className="w-80 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white/30 text-xs mb-2 font-mono">EVENT LOG</p>
          {log.length === 0 && <p className="text-white/15 text-xs">No selections yet</p>}
          {log.map((entry, i) => (
            <p key={i} className="text-white/50 text-xs font-mono py-0.5" style={{ opacity: 1 - i * 0.15 }}>
              {entry}
            </p>
          ))}
        </div>

      </div>

      {/* Live cursor visualization */}
      {cursor.visible && (
        <div
          className="absolute w-5 h-5 rounded-full pointer-events-none z-20"
          style={{
            left: cursor.x - 10,
            top:  cursor.y - 10,
            background: '#a78bfa',
            boxShadow: '0 0 16px #a78bfa',
          }}
        />
      )}

    </div>
  )
}