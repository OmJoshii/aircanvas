import { useState, useEffect, useCallback, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'
import DrawingCanvas from './DrawingCanvas'
import Toast from './Toast'
import AirKeyboard from './AirKeyboard'

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { handsRef, modelReady } = useHandTracking(videoRef, camReady)

  const canvasApiRef = useRef(null)

  const [clearTrigger,  setClearTrigger]  = useState(0)
  const [brushSize,     setBrushSize]     = useState(14)
  const [resizeMode,    setResizeMode]    = useState(false)
  const [clearProgress, setClearProgress] = useState(0)
  const [toast,         setToast]         = useState({ message: '', color: '#34d399', key: 0 })
  const [airKeyboardOpen, setAirKeyboardOpen] = useState(false)

  const showToast = useCallback((message, color = '#34d399') => {
    setToast({ message, color, key: Date.now() })
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        canvasApiRef.current?.undo()
        showToast('↶ Undo', '#818cf8')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showToast])

  const handleBrushSize = useCallback((size) => {
    setBrushSize(size)
  }, [])

  const handleResizeMode = useCallback((mode) => {
    setResizeMode(prevMode => {
      if (prevMode && !mode) {
        showToast(`🖌 Brush locked at ${brushSize}px`, '#fbbf24')
      }
      return mode
    })
  }, [showToast, brushSize])

  const handleClear = useCallback(() => {
    setClearTrigger(t => t + 1)
    showToast('✦ Canvas cleared')
  }, [showToast])

  const handleClearProgress = useCallback((progress) => {
    setClearProgress(progress)
  }, [])

  const handleAutoClear = useCallback(() => {
    showToast('✦ Canvas cleared')
  }, [showToast])

  const handleSave = useCallback(() => {
    canvasApiRef.current?.saveImage(videoRef.current)
    showToast('💾 Image saved', '#a78bfa')
  }, [showToast])

  const isActive = camReady && modelReady

  return (
    <div className="relative w-screen h-screen bg-[#07070f] overflow-hidden">

      <Toast message={toast.message} show={!!toast.key} color={toast.color} key={toast.key} />

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
          ref={canvasApiRef}
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              canvasApiRef.current?.undo()
              showToast('↶ Undo', '#818cf8')
            }}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleSave}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >
            💾 Save
          </button>
          <button
            onClick={handleClear}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >
            🗑 Clear
          </button>
          <button
            onClick={() => setAirKeyboardOpen(true)}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >          
            ⌨️ Air Type
          </button>

        </div>

        <button onClick={onExit}
          className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5">
          ✕ Exit
        </button>
      </div>

      {isActive && (
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 px-3 py-4 rounded-2xl transition-all duration-300"
          style={{
            background: resizeMode ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${resizeMode ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <span
            className="text-xs font-medium transition-colors"
            style={{ color: resizeMode ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}
          >
            {resizeMode ? '✌️' : 'Brush'}
          </span>
          <div className="relative w-1.5 h-24 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="absolute bottom-0 w-full rounded-full transition-all duration-200"
              style={{
                height: `${((brushSize - 4) / 36) * 100}%`,
                background: resizeMode
                  ? '#fbbf24'
                  : 'linear-gradient(to top, #818cf8, #f472b6)',
                boxShadow: resizeMode ? '0 0 12px #fbbf24' : 'none',
              }}
            />
          </div>
          <span
            className="text-xs font-mono transition-colors"
            style={{ color: resizeMode ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}
          >
            {brushSize}
          </span>
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

      {airKeyboardOpen && (
        <AirKeyboard
          handsRef={handsRef}
          isActive={isActive}
          onClose={() => setAirKeyboardOpen(false)}
       />
      )}

    </div>
  )
}