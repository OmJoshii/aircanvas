import { useState, useEffect } from 'react'
import {
  getAccessibilitySettings,
  updateAccessibilitySettings,
  subscribeAccessibility,
} from '../utils/accessibilitySettings'

const OPTIONS = [
  {
    key:   'oneHandedMode',
    icon:  '🤚',
    label: 'One-Handed Mode',
    desc:  'Pinch your single hand to draw — no second hand needed as trigger',
  },
  {
    key:   'voiceCommands',
    icon:  '🎤',
    label: 'Voice Commands',
    desc:  'Say "clear", "undo", "save", or a brush name like "fire" or "galaxy"',
  },
  {
    key:   'largerCursor',
    icon:  '🔵',
    label: 'Larger Cursor',
    desc:  'Bigger fingertip indicator — easier to see where your hand is',
  },
  {
    key:   'highContrast',
    icon:  '🔆',
    label: 'High Contrast',
    desc:  'Brighter camera feed and stronger hand skeleton outline',
  },
  {
    key:   'dwellToDraw',
    icon:  '⏱️',
    label: 'Dwell to Draw',
    desc:  'Hold your fingertip still to start drawing — no pinch required',
  },
]

export default function AccessibilityPanel({ onClose }) {
  const [settings, setSettings] = useState(getAccessibilitySettings())

  useEffect(() => {
    const unsub = subscribeAccessibility(setSettings)
    return unsub
  }, [])

  function toggle(key) {
    const newVal = !settings[key]
    updateAccessibilitySettings({ [key]: newVal })

    // Request mic permission when enabling voice commands
    if (key === 'voiceCommands' && newVal) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {
          updateAccessibilitySettings({ voiceCommands: false })
          alert('Microphone permission is required for voice commands.')
        })
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md mx-6 rounded-3xl p-6"
        style={{
          background: 'rgba(14,14,26,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">Accessibility</h2>
            <p className="text-white/35 text-xs mt-0.5">
              Adapt Air Canvas to your needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-sm px-3 py-1.5 rounded-full hover:bg-white/5 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {OPTIONS.map(opt => {
            const isOn = settings[opt.key]
            return (
              <button
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className="flex items-center gap-4 w-full text-left rounded-2xl px-4 py-4 transition-all duration-200"
                style={{
                  background: isOn
                    ? 'rgba(129,140,248,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOn
                    ? 'rgba(129,140,248,0.35)'
                    : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <span className="text-2xl shrink-0">{opt.icon}</span>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: isOn ? '#818cf8' : 'rgba(255,255,255,0.8)' }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>

                {/* Toggle pill */}
                <div
                  className="shrink-0 w-11 h-6 rounded-full transition-all duration-300 relative"
                  style={{
                    background: isOn
                      ? 'rgba(129,140,248,0.8)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300"
                    style={{ left: isOn ? '24px' : '4px' }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Voice command hint */}
        {settings.voiceCommands && (
          <div
            className="mt-4 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            <p className="text-xs text-white/50 leading-relaxed">
              🎤 Listening for: <span className="text-green-400">
                "clear" · "undo" · "save" · "neon" · "fire" · "galaxy" · "crystal" · "plasma" · "aurora" · "magic" · "hologram"
              </span>
            </p>
          </div>
        )}

        {/* One-handed hint */}
        {settings.oneHandedMode && (
          <div
            className="mt-3 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(129,140,248,0.08)',
              border: '1px solid rgba(129,140,248,0.2)',
            }}
          >
            <p className="text-xs text-white/50 leading-relaxed">
              🤚 Pinch your index finger and thumb together to draw with one hand
            </p>
          </div>
        )}

      </div>
    </div>
  )
}   