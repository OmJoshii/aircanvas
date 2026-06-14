import { useEffect, useRef } from 'react'

// Which landmark points to connect with lines
// Each pair [a, b] draws a line from landmark a to landmark b
const CONNECTIONS = [
  // Thumb
  [0,1],[1,2],[2,3],[3,4],
  // Index finger
  [0,5],[5,6],[6,7],[7,8],
  // Middle finger
  [0,9],[9,10],[10,11],[11,12],
  // Ring finger
  [0,13],[13,14],[14,15],[15,16],
  // Pinky
  [0,17],[17,18],[18,19],[19,20],
  // Palm connections
  [5,9],[9,13],[13,17],
]

const FINGERTIPS = [4, 8, 12, 16, 20]

// Colors per hand
const HAND_COLORS = {
  Left:  '#818cf8', // indigo for left hand
  Right: '#f472b6', // pink for right hand
}

export default function HandSkeleton({ hands, videoRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')

    // Match canvas size to video
    canvas.width  = video.videoWidth  || window.innerWidth
    canvas.height = video.videoHeight || window.innerHeight

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!hands || hands.length === 0) return

    const W = canvas.width
    const H = canvas.height

    hands.forEach(({ landmarks, handedness }) => {
      const color = HAND_COLORS[handedness] || '#ffffff'

      // Convert normalized coords (0-1) to pixel coords
      // Note: x is flipped because video is mirrored
      const toPixel = (lm) => ({
        x: (1 - lm.x) * W,
        y: lm.y * H,
      })

      const points = landmarks.map(toPixel)

      // ── Draw connection lines ──
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth   = 2
      ctx.globalAlpha = 0.5

      // Glow effect on lines
      ctx.shadowColor = color
      ctx.shadowBlur  = 8

      CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath()
        ctx.moveTo(points[a].x, points[a].y)
        ctx.lineTo(points[b].x, points[b].y)
        ctx.stroke()
      })
      ctx.restore()

      // ── Draw landmark dots ──
      points.forEach((point, index) => {
        const isTip = FINGERTIPS.includes(index)
        const isWrist = index === 0

        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur  = isTip ? 16 : 8

        ctx.beginPath()
        ctx.arc(point.x, point.y, isTip ? 7 : isWrist ? 6 : 4, 0, Math.PI * 2)

        if (isTip) {
          // Fingertips — white center with colored ring
          ctx.fillStyle   = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth   = 2
          ctx.stroke()
        } else {
          // Regular joints — solid colored dot
          ctx.fillStyle = color
          ctx.globalAlpha = 0.85
          ctx.fill()
        }

        ctx.restore()
      })
    })
  }, [hands, videoRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: 'scaleX(-1)' }} // mirror to match video
    />
  )
}