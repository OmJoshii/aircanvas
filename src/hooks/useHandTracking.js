import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

export function useHandTracking(videoRef, isActive) {
  const landmarkerRef = useRef(null)
  const animFrameRef  = useRef(null)
  const handsRef      = useRef([])      // current hands, updated every frame, NO re-render
  const [modelReady,  setModelReady]    = useState(false)

  useEffect(() => {
    async function loadModel() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands:    2,
        })
        setModelReady(true)
      } catch (err) {
        console.error('Failed to load MediaPipe model:', err)
      }
    }

    loadModel()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (!modelReady || !isActive) {
      handsRef.current = []
      return
    }

    function detect() {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      const detected = []
      if (result.landmarks && result.landmarks.length > 0) {
        result.landmarks.forEach((landmarks, i) => {
          const handedness = result.handednesses[i]?.[0]?.displayName || 'Right'
          detected.push({ landmarks, handedness })
        })
      }

      // Mutate the ref directly — NO setState, NO re-render
      handsRef.current = detected

      animFrameRef.current = requestAnimationFrame(detect)
    }

    detect()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      handsRef.current = []
    }
  }, [modelReady, isActive, videoRef])

  return { handsRef, modelReady }
}