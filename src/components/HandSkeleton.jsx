import { useEffect, useRef } from 'react'

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

const FINGERTIPS = [4, 8, 12, 16, 20]

const HAND_COLORS = {
  Left:  '#818cf8',
  Right: '#f472b6',
}

export default function HandSkeleton({ hands, videoRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    const W   = canvas.offsetWidth  || window.innerWidth
    const H   = canvas.offsetHeight || window.innerHeight

    canvas.width  = W
    canvas.height = H

    ctx.clearRect(0, 0, W, H)

    if (!hands || hands.length === 0) return

    hands.forEach(({ landmarks, handedness }) => {
      const color = HAND_COLORS[handedness] || '#ffffff'

      // No flipping here — let canvas context handle the mirror
      // We mirror the entire canvas context so coordinates
      // match the mirrored video naturally
      ctx.save()
      ctx.translate(W, 0)
      ctx.scale(-1, 1)

      const toPixel = (lm) => ({
        x: lm.x * W,
        y: lm.y * H,
      })

      const points = landmarks.map(toPixel)

      // Draw connection lines
      ctx.strokeStyle = color
      ctx.lineWidth   = 2
      ctx.globalAlpha = 0.5
      ctx.shadowColor = color
      ctx.shadowBlur  = 8

      CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath()
        ctx.moveTo(points[a].x, points[a].y)
        ctx.lineTo(points[b].x, points[b].y)
        ctx.stroke()
      })

      // Draw landmark dots
      points.forEach((point, index) => {
        const isTip   = FINGERTIPS.includes(index)
        const isWrist = index === 0

        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur  = isTip ? 16 : 8
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.arc(point.x, point.y, isTip ? 7 : isWrist ? 6 : 4, 0, Math.PI * 2)

        if (isTip) {
          ctx.fillStyle   = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth   = 2
          ctx.stroke()
        } else {
          ctx.fillStyle   = color
          ctx.globalAlpha = 0.85
          ctx.fill()
        }

        ctx.restore()
      })

      ctx.restore()
    })
  }, [hands, videoRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}