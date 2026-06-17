import { useState, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'
import DrawingCanvas from './DrawingCanvas'

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { handsRef, modelReady } = useHandTracking(videoRef, camReady)

  const [clearTrigger, setClearTrigger] = useState(0)
  const [clearProgress, setClearProgress] = useState(0)
  const [brushSize,    setBrushSize]    = useState(14)
  const [resizeMode,   setResizeMode]   = useState(false)
  const [showCleared,  setShowCleared]  = useState(false)

  const handleBrushSize = useCallback((size) => {
    setBrushSize(size)
  }, [])

  const handleResizeMode = useCallback((mode) => {
    setResizeMode(mode)
  }, [])

  const handleClear = useCallback(() => {
    setClearTrigger(t => t + 1)
    setShowCleared(true)
    setTimeout(() => setShowCleared(false), 1200)
  }, [])

  const handleClearProgress = useCallback((progress) => {
    setClearProgress(progress)
  }, [])

  const handleAutoClear = useCallback(() => {
    setShowCleared(true)
    setTimeout(() => setShowCleared(false), 1200)
  }, [])

  const isActive = camReady && modelReady

  return (
    <div className="relative w-screen h-screen bg-[#07070f] overflow-hidden">

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

      {camReady && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7,7,15,0.8) 100%)' }}
        />
      )}

      {isActive && (
        <DrawingCanvas
          handsRef={handsRef}
          isActive={isActive}
          onBrushSize={handleBrushSize}
          onResizeMode={handleResizeMode}
          onClearProgress={handleClearProgress}
          onAutoClear={handleAutoClear}
          clearTrigger={clearTrigger} 
        />
      )}

      {camReady && (
        <HandSkeleton handsRef={handsRef} isActive={camReady} />
      )}

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

      {camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-3xl p-8 max-w-sm text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm">{camError}</p>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4">
        <span className="text-white/70 font-bold tracking-wide text-sm">✦ Air Canvas</span>
        <button
          onClick={handleClear}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          🗑 Clear
        </button>
        <button onClick={onExit}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5">
          ✕ Exit
        </button>
      </div>

      {isActive && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
          <span className="text-white/30 text-xs">Brush</span>
          <div className="w-1 h-24 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="w-full rounded-full transition-all duration-200"
              style={{
                height: `${((brushSize - 4) / 36) * 100}%`,
                marginTop: `${100 - ((brushSize - 4) / 36) * 100}%`,
                background: 'linear-gradient(to top, #818cf8, #f472b6)',
              }}
            />
          </div>
          <span className="text-white/30 text-xs">{brushSize}</span>
        </div>
      )}

      {isActive && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 z-30 pointer-events-none">
          {clearProgress > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
              style={{
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.35)',
                color: '#34d399',
              }}
            >
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(52,211,153,0.2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{ width: `${clearProgress * 100}%`, background: '#34d399' }}
                />
              </div>
              Hold to clear...
            </div>
          )}
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: resizeMode ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}
          >
            {resizeMode
              ? '✌️ Resizing brush — spread or close fingers'
              : 'Pinch one hand to draw with the other · Fist to erase · Both palms to clear · ✌️✌️ to resize'}
          </p>
        </div>
      )}

    </div>
  )
}