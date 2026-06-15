import { useState, useEffect, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'
import { getGesture } from '../utils/gestureUtils'

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { hands, modelReady } = useHandTracking(videoRef, camReady)

  // Track pinch state per hand for hysteresis
  const pinchStates = useRef({ Left: false, Right: false })

  // Track current gesture per hand for display
  const [gestureLabels, setGestureLabels] = useState({ Left: '', Right: '' })

  // Both palms open = clear canvas (coming in phase 5)
  const [bothPalmsOpen, setBothPalmsOpen] = useState(false)

  // Update gesture states every time hands change
  useEffect(() => {
    if (!hands || hands.length === 0) {
      setGestureLabels({ Left: '', Right: '' })
      setBothPalmsOpen(false)
      return
    }

    const newLabels = { Left: '', Right: '' }

    hands.forEach(({ landmarks, handedness }) => {
      // Update pinch state with hysteresis
      const prev    = pinchStates.current[handedness]
      const gesture = getGesture(landmarks, prev)

      // Store new pinch state
      pinchStates.current[handedness] = gesture === 'pinch'

      newLabels[handedness] = gesture
    })

    setGestureLabels(newLabels)

    // Check if both hands are open palms
    if (hands.length === 2) {
      const bothOpen = hands.every(h => {
        const prev = pinchStates.current[h.handedness]
        return getGesture(h.landmarks, prev) === 'open'
      })
      setBothPalmsOpen(bothOpen)
    } else {
      setBothPalmsOpen(false)
    }

  }, [hands])

  // Gesture display info
  const gestureInfo = {
    pinch:   { label: 'Drawing',  color: '#ffffff', icon: '✏' },
    fist:    { label: 'Erasing',  color: '#ef4444', icon: '⌫' },
    open:    { label: 'Palm Open', color: '#34d399', icon: '🖐' },
    neutral: { label: 'Neutral',  color: '#ffffff40', icon: '·' },
  }

  return (
    <div className="relative w-screen h-screen bg-[#07070f] overflow-hidden">

      {/* ── Video feed ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform:  'scaleX(-1)',
          opacity:    camReady ? 0.4 : 0,
          transition: 'opacity 1s ease',
        }}
        playsInline
        muted
      />

      {/* ── Vignette ── */}
      {camReady && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(7,7,15,0.75) 100%)'
          }}
        />
      )}

      {/* ── Both palms flash overlay ── */}
      {bothPalmsOpen && (
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{ background: 'rgba(52,211,153,0.06)' }}
        />
      )}

      {/* ── Hand skeleton ── */}
      {camReady && (
        <HandSkeleton
          hands={hands}
          pinchStates={pinchStates.current}
        />
      )}

      {/* ── Loading overlay ── */}
      {(!camReady || !modelReady) && !camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 animate-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(244,114,182,0.2))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              ✦
            </div>
            <p className="text-white/60 font-medium mb-2">
              {!camReady ? 'Starting camera...' : 'Loading hand tracking...'}
            </p>
            <p className="text-white/25 text-sm">
              {!camReady
                ? 'Allow camera permission when prompted'
                : 'Downloading AI model, one moment...'}
            </p>
          </div>
        </div>
      )}

      {/* ── Camera error ── */}
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="rounded-3xl p-8 max-w-sm text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm leading-relaxed">{camError}</p>
          </div>
        </div>
      )}

      {/* ── Top HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">

        <span className="text-white/80 font-bold tracking-wide">✦ Air Canvas</span>

        {/* Hand gesture indicators */}
        <div className="flex items-center gap-2">
          {['Left', 'Right'].map(side => {
            const detected = hands.some(h => h.handedness === side)
            const gesture  = gestureLabels[side]
            const info     = gestureInfo[gesture] || gestureInfo.neutral
            const color    = detected ? (side === 'Left' ? '#818cf8' : '#f472b6') : null

            return (
              <div
                key={side}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  background: detected ? `${color}18` : 'rgba(255,255,255,0.04)',
                  border:     `1px solid ${detected ? color + '40' : 'rgba(255,255,255,0.08)'}`,
                  color:      detected ? color : 'rgba(255,255,255,0.25)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: detected ? color : 'rgba(255,255,255,0.15)' }}
                />
                <span>{side}</span>
                {detected && gesture && gesture !== 'neutral' && (
                  <span style={{ color: info.color, opacity: 0.9 }}>
                    · {info.icon} {info.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={onExit}
          className="text-white/40 hover:text-white/70 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          ✕ Exit
        </button>
      </div>

      {/* ── Bottom hint ── */}
      {camReady && modelReady && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div
            className="px-4 py-2 rounded-full text-xs transition-all duration-500"
            style={{
              background: bothPalmsOpen
                ? 'rgba(52,211,153,0.15)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${bothPalmsOpen
                ? 'rgba(52,211,153,0.4)'
                : 'rgba(255,255,255,0.08)'}`,
              color: bothPalmsOpen ? '#34d399' : 'rgba(255,255,255,0.35)',
            }}
          >
            {bothPalmsOpen
              ? '🖐 Both palms open — release to clear canvas'
              : hands.length === 0
              ? 'Show your hands to the camera'
              : 'Pinch to draw · Fist to erase · Both palms to clear'}
          </div>
        </div>
      )}

    </div>
  )
}