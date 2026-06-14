import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export function useHandTracking(videoRef, isActive) {
  const landmarkerRef = useRef(null)
  const animFrameRef  = useRef(null)
  const [hands,       setHands]       = useState([])
  const [modelReady,  setModelReady]  = useState(false)

  // Load the MediaPipe model once on mount
  useEffect(() => {
    async function loadModel() {
      try {
        // FilesetResolver downloads the WebAssembly runtime MediaPipe needs
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        // Create the hand landmarker with our config
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU' // use GPU acceleration, falls back to CPU
          },
          runningMode: 'VIDEO', // continuous video stream (not single images)
          numHands:    2,       // detect up to 2 hands simultaneously
        })

        setModelReady(true)
      } catch (err) {
        console.error('Failed to load MediaPipe model:', err)
      }
    }

    loadModel()

    // Cleanup animation frame on unmount
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Start detection loop when model is ready and camera is active
  useEffect(() => {
    if (!modelReady || !isActive) {
      setHands([])
      return
    }

    function detect() {
      const video = videoRef.current

      // Wait until video has actual frame data
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      // Run detection on current video frame
      // performance.now() gives the timestamp MediaPipe needs
      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      // Build our hand objects from the result
      const detected = []
      if (result.landmarks && result.landmarks.length > 0) {
        result.landmarks.forEach((landmarks, i) => {
          // MediaPipe gives handedness as an array of candidates
          // We take the first one (highest confidence)
          const handedness = result.handednesses[i]?.[0]?.displayName || 'Right'
          detected.push({ landmarks, handedness })
        })
      }

      setHands(detected)

      // Schedule next frame
      animFrameRef.current = requestAnimationFrame(detect)
    }

    detect()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setHands([])
    }
  }, [modelReady, isActive, videoRef])

  return { hands, modelReady }
}