import { useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useHandTracking } from '../hooks/useHandTracking'
import HandSkeleton from './HandSkeleton'

export default function AirCanvas({ onExit }) {
  const { videoRef, ready: camReady, error: camError } = useCamera(true)
  const { hands, modelReady } = useHandTracking(videoRef, camReady)

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

      {/* ── Hand skeleton overlay ── */}
      {camReady && (
        <HandSkeleton hands={hands} videoRef={videoRef} />
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
              {!camReady ? 'Allow camera permission when prompted' : 'Downloading AI model, one moment...'}
            </p>
          </div>
        </div>
      )}

      {/* ── Camera error ── */}
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="rounded-3xl p-8 max-w-sm text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-white/70 text-sm leading-relaxed">{camError}</p>
          </div>
        </div>
      )}

      {/* ── Top HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-white/80 font-bold tracking-wide">✦ Air Canvas</span>
        </div>

        {/* Hand detection indicators */}
        <div className="flex items-center gap-3">
          {['Left', 'Right'].map(side => {
            const detected = hands.some(h => h.handedness === side)
            const color    = side === 'Left' ? '#818cf8' : '#f472b6'
            return (
              <div
                key={side}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  background: detected ? `${color}20` : 'rgba(255,255,255,0.05)',
                  border:     `1px solid ${detected ? color + '50' : 'rgba(255,255,255,0.1)'}`,
                  color:      detected ? color : 'rgba(255,255,255,0.3)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: detected ? color : 'rgba(255,255,255,0.2)' }}
                />
                {side}
              </div>
            )
          })}
        </div>

        {/* Exit button */}
        <button
          onClick={onExit}
          className="text-white/40 hover:text-white/70 text-sm px-4 py-2 rounded-full transition-all hover:bg-white/5"
        >
          ✕ Exit
        </button>

      </div>

      {/* ── Bottom status ── */}
      {camReady && modelReady && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          <div
            className="px-4 py-2 rounded-full text-xs text-white/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {hands.length === 0
              ? 'Show your hands to the camera'
              : `${hands.length} hand${hands.length > 1 ? 's' : ''} detected — drawing coming in Phase 5`}
          </div>
        </div>
      )}

    </div>
  )
}