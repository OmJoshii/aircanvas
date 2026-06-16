import { useState, useEffect, useRef, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'
import DrawingCanvas from './DrawingCanvas'
import { getGesture } from '../utils/gestureUtils'

const CLEAR_HOLD_MS = 1000

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { hands, modelReady } = useHandTracking(videoRef, camReady)

  const pinchStates    = useRef({ Left: false, Right: false })
  const bothPalmTimer  = useRef(null)
  const bothPalmStart  = useRef(null)

  const [gestureLabels,  setGestureLabels]  = useState({ Left: '', Right: '' })
  const [bothPalmsOpen,  setBothPalmsOpen]  = useState(false)
  const [clearTrigger,   setClearTrigger]   = useState(0)
  const [clearProgress,  setClearProgress]  = useState(0)
  const [brushSize,      setBrushSize]      = useState(12)
  const [showCleared,    setShowCleared]    = useState(false)
  const [resizeMode, setResizeMode] = useState(false)

  // Trigger canvas clear
  const triggerClear = useCallback(() => {
    setClearTrigger(t => t + 1)
    setShowCleared(true)
    setTimeout(() => setShowCleared(false), 1200)
  }, [])

  // Update gestures every time hands change
  useEffect(() => {
    if (!hands || hands.length === 0) {
      setGestureLabels({ Left: '', Right: '' })
      setBothPalmsOpen(false)
      setClearProgress(0)
      bothPalmStart.current = null
      return
    }

    const newLabels = { Left: '', Right: '' }

    hands.forEach(({ landmarks, handedness }) => {
      const prev    = pinchStates.current[handedness]
      const gesture = getGesture(landmarks, prev)
      pinchStates.current[handedness] = gesture === 'pinch'
      newLabels[handedness] = gesture
    })

    setGestureLabels(newLabels)

    // Both palms open = start clear countdown
    const bothOpen = hands.length === 2 &&
      hands.every(h => getGesture(h.landmarks, pinchStates.current[h.handedness]) === 'open')

    setBothPalmsOpen(bothOpen)

    if (bothOpen) {
      if (!bothPalmStart.current) {
        bothPalmStart.current = performance.now()
      }
      const elapsed  = performance.now() - bothPalmStart.current
      const progress = Math.min(elapsed / CLEAR_HOLD_MS, 1)
      setClearProgress(progress)

      if (progress >= 1) {
        triggerClear()
        bothPalmStart.current = null
        setClearProgress(0)
      }
    } else {
      bothPalmStart.current = null
      setClearProgress(0)
    }

  }, [hands, triggerClear])

  const gestureInfo = {
    pinch:   { label: 'Drawing',   color: '#ffffff',  icon: '✏' },
    fist:    { label: 'Erasing',   color: '#ef4444',  icon: '⌫' },
    open:    { label: 'Palm Open', color: '#34d399',  icon: '🖐' },
    neutral: { label: '',          color: '#ffffff40', icon: ''  },
  }

  return (
    <div className="relative w-screen h-screen bg-[#07070f] overflow-hidden">

      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform:  'scaleX(-1)',
          opacity:    camReady ? 0.35 : 0,
          transition: 'opacity 1s ease',
        }}
        playsInline
        muted
      />

      {/* Vignette */}
      {camReady && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7,7,15,0.8) 100%)' }}
        />
      )}

      {/* Drawing canvas */}
      {camReady && modelReady && (
        <DrawingCanvas
          hands={hands}
          gestureLabels={gestureLabels}
          onBrushSize={setBrushSize}
          onResizeMode={setResizeMode}
          clearTrigger={clearTrigger}
        />
      )}

      {/* Hand skeleton */}
      {camReady && (
        <HandSkeleton hands={hands} pinchStates={pinchStates.current} />
      )}

      {/* Both palms clear overlay */}
      {bothPalmsOpen && (
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background: `rgba(52,211,153,${clearProgress * 0.08})` }}
        />
      )}

      {/* Cleared flash */}
      {showCleared && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div
            className="px-6 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.4)',
              color: '#34d399',
            }}
          >
            ✦ Canvas Cleared
          </div>
        </div>
      )}

      {/* Loading */}
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
              {!camReady ? 'Allow camera permission when prompted' : 'Downloading AI model, one moment...'}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-3xl p-8 max-w-sm text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm">{camError}</p>
          </div>
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4">
        <span className="text-white/70 font-bold tracking-wide text-sm">✦ Air Canvas</span>

        <div className="flex items-center gap-2">
          {['Left', 'Right'].map(side => {
            const detected = hands.some(h => h.handedness === side)
            const gesture  = gestureLabels[side]
            const info     = gestureInfo[gesture] || gestureInfo.neutral
            const color    = side === 'Left' ? '#818cf8' : '#f472b6'
            return (
              <div key={side}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  background: detected ? `${color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${detected ? color + '40' : 'rgba(255,255,255,0.08)'}`,
                  color: detected ? color : 'rgba(255,255,255,0.2)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: detected ? color : 'rgba(255,255,255,0.15)' }} />
                <span>{side}</span>
                {detected && gesture && gesture !== 'neutral' && (
                  <span style={{ color: info.color }}>· {info.icon} {info.label}</span>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={onExit}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5">
          ✕ Exit
        </button>
      </div>

      {/* Brush size indicator */}
      {camReady && modelReady && hands.length > 0 && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
          <span className="text-white/30 text-xs">Brush</span>
          <div className="w-1 h-24 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="w-full rounded-full transition-all duration-200"
              style={{
                height: `${((brushSize - 5) / 23) * 100}%`,
                marginTop: `${100 - ((brushSize - 5) / 23) * 100}%`,
                background: 'linear-gradient(to top, #818cf8, #f472b6)',
              }}
            />
          </div>
          <span className="text-white/30 text-xs">{brushSize}</span>
        </div>
      )}

      {/* Clear progress ring */}
      {bothPalmsOpen && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center z-30">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full text-xs"
            style={{
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.35)',
              color: '#34d399',
            }}
          >
            <div className="w-16 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(52,211,153,0.2)' }}>
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${clearProgress * 100}%`,
                  background: '#34d399',
                }}
              />
            </div>
            Hold to clear...
          </div>
        </div>
      )}

      {/* Bottom hint */}
      {camReady && modelReady && !bothPalmsOpen && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: resizeMode ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}
          >
            {resizeMode
              ? '✌️ Resizing brush — spread or close fingers'
              : 'Pinch one hand to draw with the other · Fist to erase · Both palms to clear · ✌️✌️ both hands to resize'}
          </p>
        </div>
      )}

    </div>
  )
}