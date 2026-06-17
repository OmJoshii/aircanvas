import { useEffect, useState } from 'react'

export default function Toast({ message, show, color = '#34d399' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 1800)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!message) return null

  return (
    <div
      className="absolute top-20 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translate(-50%, 0) scale(1)'
          : 'translate(-50%, -10px) scale(0.95)',
      }}
    >
      <div
        className="px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}40`,
          color: color,
          backdropFilter: 'blur(12px)',
        }}
      >
        {message}
      </div>
    </div>
  )
}