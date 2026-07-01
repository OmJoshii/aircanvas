import { useState, useEffect, useRef } from 'react'
import { useGestureOS } from '../sdk/useGestureOS'
import { useGestureTarget } from '../sdk/useGestureTarget'
import GestureOS from '../sdk/GestureOS'

function GestureButton({ label, color, onSelect, ready, dwellMs = 600 }) {
  const { elRef, hovered, progress } = useGestureTarget({ onSelect, dwellMs, ready })

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
      <div
        className="absolute inset-0 origin-left transition-none"
        style={{ background: `${color}30`, transform: `scaleX(${progress})` }}
      />
      <span className="relative z-10">{label}</span>
    </button>
  )
}

// ── A selectable item used inside modals (files, settings options) ─────────
function GestureItem({ label, sub, color = '#818cf8', onSelect, ready, dwellMs = 500 }) {
  const { elRef, hovered, progress } = useGestureTarget({ onSelect, dwellMs, ready })

  return (
    <div
      ref={elRef}
      className="relative flex items-center justify-between px-5 py-4 rounded-xl overflow-hidden cursor-default"
      style={{
        background: hovered ? `${color}1a` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? color + '50' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div
        className="absolute inset-0 origin-left"
        style={{ background: `${color}25`, transform: `scaleX(${progress})` }}
      />
      <div className="relative z-10">
        <p className="text-white/85 text-sm font-medium">{label}</p>
        {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
      </div>
      <span className="relative z-10 text-white/20 text-xs">{Math.round(progress * 100)}%</span>
    </div>
  )
}

// ── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel({ onClose, ready, dwellMs, setDwellMs }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(14,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Settings</h3>
        <p className="text-white/35 text-xs mb-6">Adjust SDK dwell sensitivity</p>

        <div className="flex flex-col gap-3 mb-6">
          {[
            { label: 'Fast',   sub: '400ms dwell',  value: 400 },
            { label: 'Normal', sub: '600ms dwell',  value: 600 },
            { label: 'Slow',   sub: '900ms dwell',  value: 900 },
          ].map(opt => (
            <GestureItem
              key={opt.value}
              label={`${dwellMs === opt.value ? '● ' : '○ '}${opt.label}`}
              sub={opt.sub}
              color="#34d399"
              onSelect={() => setDwellMs(opt.value)}
              ready={ready}
            />
          ))}
        </div>

        <GestureItem label="✕ Close Settings" color="#ef4444" onSelect={onClose} ready={ready} />
      </div>
    </div>
  )
}

// ── Files panel ───────────────────────────────────────────────────────────────
function FilesPanel({ onClose, ready }) {
  const [opened, setOpened] = useState(null)
  const files = [
    { name: 'project-notes.txt', size: '2.1 KB' },
    { name: 'roadmap.pdf',       size: '184 KB' },
    { name: 'screenshot.png',    size: '1.2 MB' },
    { name: 'budget.xlsx',       size: '34 KB'  },
  ]

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(14,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Files</h3>
        <p className="text-white/35 text-xs mb-6">Hover a file to open it</p>

        <div className="flex flex-col gap-2 mb-6">
          {files.map(f => (
            <GestureItem
              key={f.name}
              label={f.name}
              sub={f.size}
              color="#fbbf24"
              onSelect={() => setOpened(f.name)}
              ready={ready}
            />
          ))}
        </div>

        {opened && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
            Opened: {opened}
          </div>
        )}

        <GestureItem label="✕ Close Files" color="#ef4444" onSelect={onClose} ready={ready} />
      </div>
    </div>
  )
}

// ── Alerts panel — live GestureOS event feed ────────────────────────────────
function AlertsPanel({ onClose, ready }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!ready) return

    const unsubPinch = GestureOS.onPinch((phase) => {
      setEvents(e => [`Pinch ${phase}`, ...e].slice(0, 8))
    })
    const unsubSwipe = GestureOS.onSwipe((dir) => {
      setEvents(e => [`Swipe ${dir}`, ...e].slice(0, 8))
    })

    return () => { unsubPinch(); unsubSwipe() }
  }, [ready])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(14,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Alerts</h3>
        <p className="text-white/35 text-xs mb-6">Live pinch and swipe events — try pinching or swiping your hand</p>

        <div className="mb-6 rounded-xl p-4 min-h-[140px]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {events.length === 0 && <p className="text-white/15 text-xs">No events yet — try a pinch or swipe</p>}
          {events.map((ev, i) => (
            <p key={i} className="text-white/50 text-xs font-mono py-0.5" style={{ opacity: 1 - i * 0.1 }}>
              {ev}
            </p>
          ))}
        </div>

        <GestureItem label="✕ Close Alerts" color="#ef4444" onSelect={onClose} ready={ready} />
      </div>
    </div>
  )
}

// ── Profile panel — live SDK diagnostics ────────────────────────────────────
function ProfilePanel({ onClose, ready, cursor }) {
  const [fps, setFps] = useState(0)
  const frameCountRef = useRef(0)
  const lastTimeRef    = useRef(performance.now())

  useEffect(() => {
    let raf
    function tick() {
      frameCountRef.current++
      const now = performance.now()
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{ background: 'rgba(14,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Profile</h3>
        <p className="text-white/35 text-xs mb-6">Live SDK diagnostics</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'SDK Status', value: ready ? 'Ready' : 'Loading', color: ready ? '#34d399' : '#fbbf24' },
            { label: 'Frame Rate', value: `${fps} fps`, color: '#818cf8' },
            { label: 'Cursor X',   value: Math.round(cursor.x),  color: '#a78bfa' },
            { label: 'Cursor Y',   value: Math.round(cursor.y),  color: '#a78bfa' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-[10px] uppercase tracking-wide mb-1">{stat.label}</p>
              <p className="text-sm font-mono font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <GestureItem label="✕ Close Profile" color="#ef4444" onSelect={onClose} ready={ready} />
      </div>
    </div>
  )
}

// ── Main SDK demo ──────────────────────────────────────────────────────────
export default function SDKDemo({ onExit }) {
  const { videoRef, ready, cursor } = useGestureOS()
  const [activePanel, setActivePanel] = useState(null) // 'settings' | 'files' | 'alerts' | 'profile' | null
  const [dwellMs, setDwellMs] = useState(600)

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
          <GestureButton label="🏠 Home"     color="#818cf8" onSelect={onExit} ready={ready} dwellMs={dwellMs} />
          <GestureButton label="⚙️ Settings" color="#34d399" onSelect={() => setActivePanel('settings')} ready={ready} dwellMs={dwellMs} />
          <GestureButton label="📁 Files"    color="#fbbf24" onSelect={() => setActivePanel('files')}    ready={ready} dwellMs={dwellMs} />
          <GestureButton label="🔔 Alerts"   color="#f472b6" onSelect={() => setActivePanel('alerts')}   ready={ready} dwellMs={dwellMs} />
          <GestureButton label="👤 Profile"  color="#a78bfa" onSelect={() => setActivePanel('profile')}  ready={ready} dwellMs={dwellMs} />
          <GestureButton label="🚪 Exit"     color="#ef4444" onSelect={onExit} ready={ready} dwellMs={dwellMs} />
        </div>

        <p className="text-white/15 text-xs font-mono">
          Current dwell speed: {dwellMs}ms
        </p>

      </div>

      {activePanel === 'settings' && (
        <SettingsPanel onClose={() => setActivePanel(null)} ready={ready} dwellMs={dwellMs} setDwellMs={setDwellMs} />
      )}
      {activePanel === 'files' && (
        <FilesPanel onClose={() => setActivePanel(null)} ready={ready} />
      )}
      {activePanel === 'alerts' && (
        <AlertsPanel onClose={() => setActivePanel(null)} ready={ready} />
      )}
      {activePanel === 'profile' && (
        <ProfilePanel onClose={() => setActivePanel(null)} ready={ready} cursor={cursor} />
      )}

      {cursor.visible && (
        <div
          className="absolute w-5 h-5 rounded-full pointer-events-none z-40"
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