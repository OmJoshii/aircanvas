import { useState, useEffect, useCallback, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'
import DrawingCanvas from './DrawingCanvas'
import Toast from './Toast'
import AirKeyboard from './AirKeyboard'
import BrushPicker from './BrushPicker'
import AccessibilityPanel from './AccessibilityPanel'
import { useVoiceCommands } from '../hooks/useVoiceCommands'
import { getAccessibilitySettings, subscribeAccessibility } from '../utils/accessibilitySettings'

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { handsRef, modelReady } = useHandTracking(videoRef, camReady)

  useVoiceCommands(a11ySettings.voiceCommands && isActive, {
    onClear:  handleClear,
    onUndo:   () => { canvasApiRef.current?.undo(); showToast('↶ Undo', '#818cf8') },
    onSave:   handleSave,
    onBrush:  (b) => { setActiveBrush(b); showToast(`🎨 ${b} brush`, '#a78bfa') },
  })

  const canvasApiRef = useRef(null)

  const [clearTrigger,  setClearTrigger]  = useState(0)
  const [brushSize,     setBrushSize]     = useState(14)
  const [resizeMode,    setResizeMode]    = useState(false)
  const [clearProgress, setClearProgress] = useState(0)
  const [toast,         setToast]         = useState({ message: '', color: '#34d399', key: 0 })
  const [airKeyboardOpen, setAirKeyboardOpen] = useState(false)
  const [brushPickerOpen, setBrushPickerOpen] = useState(false)
  const [activeBrush,     setActiveBrush]     = useState('neon')
  const [activeColor,     setActiveColor]     = useState(null) // null = use hand palette
  const [a11yOpen,       setA11yOpen]       = useState(false)
  const [a11ySettings,   setA11ySettings]   = useState(getAccessibilitySettings())

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

  useEffect(() => {
    const unsub = subscribeAccessibility(setA11ySettings)
    return unsub
  }, [])

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
          opacity:    camReady ? (a11ySettings.highContrast ? 0.65 : 0.35) : 0,
          filter:     a11ySettings.highContrast ? 'brightness(1.4) contrast(1.2)' : undefined,
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

      {airKeyboardOpen && (
        <AirKeyboard
          handsRef={handsRef}
          isActive={isActive}
          onClose={() => setAirKeyboardOpen(false)}
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
          brushId={activeBrush}
          customColor={activeColor}
        />
      )}

      {a11yOpen && (
        <AccessibilityPanel onClose={() => setA11yOpen(false)} />
      )}

      {camReady && (
        <HandSkeleton handsRef={handsRef} isActive={camReady} />
      )}

      {brushPickerOpen && (
        <BrushPicker
          handsRef={handsRef}
          isActive={isActive}
          currentBrush={activeBrush}
          currentColor={activeColor}
          onBrushChange={(b) => { setActiveBrush(b); setBrushPickerOpen(false) }}
          onColorChange={(c) => { setActiveColor(c); setBrushPickerOpen(false) }}
          onClose={() => setBrushPickerOpen(false)}
        />
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
            onClick={() => setBrushPickerOpen(b => !b)}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
            style={{ color: brushPickerOpen ? '#a78bfa' : undefined }}
          >
            🎨 Brush
          </button>
          <button
            onClick={() => setAirKeyboardOpen(true)}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >          
            ⌨️ Air Type
          </button>

          <button
            onClick={() => setA11yOpen(true)}
            className="text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
          >
            ♿ Access
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

      {a11ySettings.voiceCommands && isActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Listening for voice commands
          </div>
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