import { useEffect, useRef, useState } from 'react'

export function useCamera(isActive) {
  const videoRef  = useRef(null)
  const [ready,   setReady]   = useState(false)
  const [error,   setError]   = useState(null)
  const streamRef = useRef(null)

  useEffect(() => {
    // Don't start if not active
    if (!isActive) return

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:      { ideal: 1280 },
            height:     { ideal: 720  },
            facingMode: 'user',          // front camera
          },
          audio: false,                  // no microphone needed
        })

        // Store stream reference so we can stop it later
        streamRef.current = stream

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setReady(true)
          }
        }
      } catch (err) {
        // Common errors:
        // NotAllowedError  — user denied permission
        // NotFoundError    — no camera found
        console.error('Camera error:', err)
        setError(err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and refresh.'
          : 'No camera found. Please connect a camera and refresh.'
        )
      }
    }

    startCamera()

    // Cleanup — stop camera when component unmounts or isActive becomes false
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setReady(false)
    }
  }, [isActive])

  return { videoRef, ready, error }
}