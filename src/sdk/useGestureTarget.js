import { useEffect, useRef, useState } from 'react'
import GestureOS from './GestureOS'

// Hook for a single interactive element — call inside any component
// that should respond to hover/select gestures.
// `ready` should reflect GestureOS.isReady() from the parent's useGestureOS()
// hook, so registration retries once the SDK actually finishes initializing.
export function useGestureTarget({ onSelect, dwellMs = 700, ready = false } = {}) {
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [progress, setProgress] = useState(0)

  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const el = elRef.current
    if (!el || !ready) return

    const unsubHover = GestureOS.onHover(el, (isOver) => {
      setHovered(isOver)
    })

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
  }, [dwellMs, ready])

  return { elRef, hovered, progress }
}