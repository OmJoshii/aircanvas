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

  const canvasApiRef = useRef(null)

  const [clearTrigger,    setClearTrigger]    = useState(0)
  const [brushSize,       setBrushSize]       = useState(14)
  const [resizeMode,      setResizeMode]      = useState(false)
  const [clearProgress,   setClearProgress]   = useState(0)
  const [toast,           setToast]           = useState({ message: '', color: '#34d399', key: 0 })
  const [airKeyboardOpen, setAirKeyboardOpen] = useState(false)
  const [brushPickerOpen, setBrushPickerOpen] = useState(false)
  const [activeBrush,     setActiveBrush]     = useState('neon')
  const [activeColor,     setActiveColor]     = useState(null)
  const [a11yOpen,        setA11yOpen]        = useState(false)
  const [a11ySettings,    setA11ySettings]    = useState(getAccessibilitySettings())

  // isActive defined here — before any hook that needs it
  const isActive = camReady && modelReady

  const showToast = useCallback((message, color = '#34d399') => {
    setToast({ message, color, key: Date.now() })
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

  // Now safe — isActive, handleClear, handleSave, showToast all defined above
  useVoiceCommands(a11ySettings.voiceCommands && isActive, {
    onClear:  handleClear,
    onUndo:   () => { canvasApiRef.current?.undo(); showToast('↶ Undo', '#818cf8') },
    onSave:   handleSave,
    onBrush:  (b) => { setActiveBrush(b); showToast(`🎨 ${b} brush`, '#a78bfa') },
  })

  return (
    <div className="relative w-screen h-screen bg-[#050508] overflow-hidden">

      <Toast message={toast.message} show={!!toast.key} color={toast.color} key={toast.key} />

      {/* ── Video feed ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform:  'scaleX(-1)',
          opacity:    camReady ? (a11ySettings.highContrast ? 0.65 : 0.38) : 0,
          filter:     a11ySettings.highContrast ? 'brightness(1.4) contrast(1.2)' : undefined,
          transition: 'opacity 1.2s ease',
        }}
        playsInline
        muted
      />

      {/* ── Vignette ── */}
      {camReady && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, transparent 25%, rgba(5,5,8,0.7) 100%),
              linear-gradient(to bottom, rgba(5,5,8,0.5) 0%, transparent 15%, transparent 85%, rgba(5,5,8,0.6) 100%)
            `
          }}
        />
      )}

      {/* ── Drawing and skeleton layers ── */}
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

      {camReady && <HandSkeleton handsRef={handsRef} isActive={camReady} />}

      {/* ── Panels ── */}
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
      {a11yOpen && <AccessibilityPanel onClose={() => setA11yOpen(false)} />}

      {/* ── Loading screen ── */}
      {(!camReady || !modelReady) && !camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 60%)' }}
          />
          <div className="text-center relative z-10">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.3))',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">✦</div>
            </div>
            <p className="text-white/70 font-semibold text-lg mb-2">
              {!camReady ? 'Starting camera...' : 'Loading AI model...'}
            </p>
            <p className="text-white/25 text-sm">
              {!camReady ? 'Allow camera permission when prompted' : 'Hand tracking model downloading...'}
            </p>
            {/* Loading bar */}
            <div className="mt-6 w-48 mx-auto h-0.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full animate-pulse"
                style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899)', width: '60%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Error screen ── */}
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-3xl p-8 max-w-sm text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm">{camError}</p>
          </div>
        </div>
      )}

      {/* ── TOP HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        {/* Frosted glass top bar */}
        <div
          className="flex items-center justify-between px-5 py-3 pointer-events-auto"
          style={{
            background: 'rgba(5,5,8,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}
            >
              ✦
            </div>
            <span
              className="font-bold text-sm tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #ffffff, rgba(255,255,255,0.6))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Air Canvas
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {[
              { icon: '↶', label: 'Undo',   onClick: () => { canvasApiRef.current?.undo(); showToast('↶ Undo', '#818cf8') } },
              { icon: '💾', label: 'Save',   onClick: handleSave },
              { icon: '🗑', label: 'Clear',  onClick: handleClear },
              { icon: '🎨', label: 'Brush',  onClick: () => setBrushPickerOpen(b => !b), active: brushPickerOpen },
              { icon: '⌨️', label: 'Type',   onClick: () => setAirKeyboardOpen(true) },
              { icon: '♿', label: 'Access', onClick: () => setA11yOpen(true) },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: btn.active
                    ? 'rgba(129,140,248,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${btn.active
                    ? 'rgba(129,140,248,0.4)'
                    : 'rgba(255,255,255,0.08)'}`,
                  color: btn.active ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                }}
              >
                <span className="text-sm">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Exit */}
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: 'rgba(239,68,68,0.6)',
            }}
          >
            <span>✕</span>
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* ── LEFT SIDE — Brush indicator ── */}
      {isActive && (
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl"
            style={{
              background: resizeMode
                ? 'rgba(251,191,36,0.08)'
                : 'rgba(5,5,8,0.6)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${resizeMode
                ? 'rgba(251,191,36,0.25)'
                : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            {/* Current brush icon */}
            <span className="text-base" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}>
              {resizeMode ? '✌️' : '🖌️'}
            </span>

            {/* Vertical slider */}
            <div
              className="relative w-1 h-20 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="absolute bottom-0 w-full rounded-full transition-all duration-200"
                style={{
                  height: `${((brushSize - 4) / 36) * 100}%`,
                  background: resizeMode
                    ? 'linear-gradient(to top, #fbbf24, #f59e0b)'
                    : 'linear-gradient(to top, #6366f1, #a78bfa, #f472b6)',
                  boxShadow: resizeMode
                    ? '0 0 8px rgba(251,191,36,0.6)'
                    : '0 0 8px rgba(129,140,248,0.6)',
                }}
              />
            </div>

            {/* Size number */}
            <span
              className="text-xs font-mono font-bold"
              style={{ color: resizeMode ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}
            >
              {brushSize}
            </span>
          </div>
        </div>
      )}

      {/* ── Voice listening pill ── */}
      {a11ySettings.voiceCommands && isActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 mt-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.2)',
              color: '#34d399',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Listening for voice commands
          </div>
        </div>
      )}

      {/* ── BOTTOM HUD ── */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div
            className="flex flex-col items-center gap-2 py-4"
            style={{
              background: 'linear-gradient(to top, rgba(5,5,8,0.7) 0%, transparent 100%)',
            }}
          >
            {/* Clear progress bar */}
            {clearProgress > 0 && (
              <div
                className="flex items-center gap-3 px-4 py-2 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  color: '#34d399',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="w-20 h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${clearProgress * 100}%`,
                      background: 'linear-gradient(90deg, #34d399, #6ee7b7)',
                      boxShadow: '0 0 6px rgba(52,211,153,0.6)',
                    }}
                  />
                </div>
                Hold both palms to clear...
              </div>
            )}

            {/* Hint text */}
            <p
              className="text-xs tracking-wide transition-colors duration-300"
              style={{ color: resizeMode ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.18)' }}
            >
              {resizeMode
                ? '✌️  Spread or close fingers to resize brush'
                : 'Pinch to draw  ·  Fist to erase  ·  Both palms to clear  ·  ✌️✌️ to resize'}
            </p>
          </div>
        </div>
      )}

      {/* ── Air Keyboard ── */}
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