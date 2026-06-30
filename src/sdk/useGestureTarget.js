import { useEffect, useRef, useState } from 'react'
import GestureOS from './GestureOS'

// Hook for a single interactive element — call inside any component
// that should respond to hover/select gestures
export function useGestureTarget({ onSelect, dwellMs = 700 } = {}) {
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [progress, setProgress] = useState(0)

  // Keep the latest onSelect in a ref so the effect below never needs
  // to re-run just because a new inline function was passed in on render
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const el = elRef.current
    if (!el || !GestureOS.isReady()) return

    const unsubHover = GestureOS.onHover(el, (isOver) => {
      setHovered(isOver)
    })

    // Wrap in a stable function that always calls the LATEST onSelect
    // via the ref — this function itself never changes between renders
    const stableSelectHandler = () => {
      onSelectRef.current?.()
    }

    const unsubSelect = GestureOS.onSelect(el, stableSelectHandler, dwellMs)

    function handleDwellEvent(e) {
      setProgress(e.detail.progress)
    }
    el.addEventListener('gestureos:dwell', handleDwellEvent)

    return () => {
      unsubHover()
      unsubSelect()
      el.removeEventListener('gestureos:dwell', handleDwellEvent)
    }
    // Only re-register if the element itself or dwellMs changes —
    // NOT every time a new onSelect function reference is passed in
  }, [dwellMs])

  return { elRef, hovered, progress }
}