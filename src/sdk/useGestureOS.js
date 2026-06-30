import { useEffect, useRef, useState } from 'react'
import GestureOS from './GestureOS'

// React hook wrapper around the GestureOS SDK
// Handles camera setup and exposes ready state + cursor position reactively
export function useGestureOS({ autoStart = true } = {}) {
  const videoRef = useRef(null)
  const [ready,   setReady]   = useState(false)
  const [cursor,  setCursor]  = useState({ x: 0, y: 0, visible: false })
  const pollRef   = useRef(null)

  useEffect(() => {
    if (!autoStart) return

    let stream = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        await GestureOS.init(videoRef.current)
        setReady(true)

        // Poll cursor position into React state at a UI-friendly rate (not 60fps)
        pollRef.current = setInterval(() => {
          setCursor(GestureOS.cursor())
        }, 50)

      } catch (err) {
        console.error('GestureOS failed to start:', err)
      }
    }

    start()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      GestureOS.destroy()
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [autoStart])

  return { videoRef, ready, cursor, GestureOS }
}