import { useCamera } from '../hooks/useCamera'

export default function CameraView({ isActive, children }) {
  const { videoRef, ready, error } = useCamera(isActive)

  return (
    <div className="relative w-screen h-screen bg-[#07070f] overflow-hidden">

      {/* Video feed — full screen, mirrored */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform:  'scaleX(-1)',
          opacity:    ready ? 0.45 : 0,   // dimmed so drawings pop
          transition: 'opacity 0.8s ease',
        }}
        playsInline
        muted
      />

      {/* Dark vignette overlay — darkens edges, focuses center */}
      {ready && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,7,15,0.7) 100%)'
          }}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-sm text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state — while camera initializes */}
      {isActive && !ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">📷</div>
            <p className="text-white/40 text-sm">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Everything else (canvas, HUD) goes here as children */}
      {ready && children}

    </div>
  )
}