import { useEffect, useRef } from 'react'
import { getGesture } from '../utils/gestureUtils'

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

const FINGERTIPS = [4, 8, 12, 16, 20]

// Base color per hand
const HAND_COLORS = {
  Left:  '#818cf8',
  Right: '#f472b6',
}

// Gesture changes the color
const GESTURE_COLORS = {
  pinch:   '#ffffff', // white when drawing
  fist:    '#ef4444', // red when erasing
  open:    '#34d399', // green when clearing
  neutral: null,      // use default hand color
}

export default function HandSkeleton({ handsRef, isActive }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const canvas = canvasRef.current
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      const ctx = canvas.getContext('2d')
      const W   = canvas.offsetWidth  || window.innerWidth
      const H   = canvas.offsetHeight || window.innerHeight

      canvas.width  = W
      canvas.height = H
      ctx.clearRect(0, 0, W, H)

      const hands = handsRef.current || []

      hands.forEach(({ landmarks, handedness }) => {
        const gesture   = getGesture(landmarks, false)
        const baseColor = HAND_COLORS[handedness] || '#ffffff'
        const color     = GESTURE_COLORS[gesture] || baseColor

        ctx.save()
        ctx.translate(W, 0)
        ctx.scale(-1, 1)

        const toPixel = (lm) => ({ x: lm.x * W, y: lm.y * H })
        const points  = landmarks.map(toPixel)

        ctx.strokeStyle = color
        ctx.lineWidth   = gesture === 'pinch' ? 2.5 : 1.5
        ctx.globalAlpha = gesture === 'pinch' ? 0.8 : 0.45
        ctx.shadowColor = color
        ctx.shadowBlur  = gesture === 'pinch' ? 12 : 6

        CONNECTIONS.forEach(([a, b]) => {
          ctx.beginPath()
          ctx.moveTo(points[a].x, points[a].y)
          ctx.lineTo(points[b].x, points[b].y)
          ctx.stroke()
        })

        points.forEach((point, index) => {
          const isTip   = FINGERTIPS.includes(index)
          const isWrist = index === 0
          const isPinchFinger = gesture === 'pinch' && (index === 4 || index === 8)

          ctx.save()
          ctx.shadowColor = color
          ctx.shadowBlur  = isTip ? 20 : 8
          ctx.globalAlpha = 1

          ctx.beginPath()
          ctx.arc(point.x, point.y, isPinchFinger ? 9 : isTip ? 6 : isWrist ? 5 : 3.5, 0, Math.PI * 2)

          if (isTip || isPinchFinger) {
            ctx.fillStyle   = '#ffffff'
            ctx.fill()
            ctx.strokeStyle = color
            ctx.lineWidth   = isPinchFinger ? 3 : 2
            ctx.stroke()
          } else {
            ctx.fillStyle   = color
            ctx.globalAlpha = 0.75
            ctx.fill()
          }
          ctx.restore()
        })

        ctx.restore()
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, handsRef])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}