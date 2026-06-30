import { useEffect, useRef, useState } from 'react'
import GestureOS from './GestureOS'

// Hook for a single interactive element — call inside any component
// that should respond to hover/select gestures
export function useGestureTarget({ onSelect, dwellMs = 700 } = {}) {
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = elRef.current
    if (!el || !GestureOS.isReady()) return

    const unsubHover = GestureOS.onHover(el, (isOver) => {
      setHovered(isOver)
    })

    const unsubSelect = onSelect
      ? GestureOS.onSelect(el, onSelect, dwellMs)
      : () => {}

    function handleDwellEvent(e) {
      setProgress(e.detail.progress)
    }
    el.addEventListener('gestureos:dwell', handleDwellEvent)

    return () => {
      unsubHover()
      unsubSelect()
      el.removeEventListener('gestureos:dwell', handleDwellEvent)
    }
  }, [onSelect, dwellMs])

  return { elRef, hovered, progress }
}