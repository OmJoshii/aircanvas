import { useRef, useEffect, useCallback } from 'react'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'
import { getCurrentColor, toRgb }          from '../utils/drawingEngine'
import { PhysicsWorld, PhysicsObject }     from '../utils/physicsEngine'

const SMOOTHING = 0.5

export default function PhysicsCanvas({ handsRef, isActive, clearTrigger }) {
  const drawCanvasRef  = useRef(null)  // where the user draws (temporary)
  const physCanvasRef  = useRef(null)  // physics world display
  const animFrameRef   = useRef(null)
  const smoothedPoints = useRef({})
  const isFirstPoint   = useRef({})
  const strokePathRef  = useRef({})
  const wasPinching    = useRef({ Left: false, Right: false })
  const pinchStates    = useRef({ Left: false, Right: false })
  const frameCount     = useRef(0)
  const worldRef       = useRef(new PhysicsWorld())

  const clearAll = useCallback(() => {
    worldRef.current.clear()
    const dc = drawCanvasRef.current
    if (dc) dc.getContext('2d').clearRect(0, 0, dc.width, dc.height)
  }, [])

  useEffect(() => {
    if (clearTrigger > 0) clearAll()
  }, [clearTrigger, clearAll])

  // Capture a stroke's pixels into an offscreen canvas for use as a sprite
  const captureStroke = useCallback((strokePoints) => {
    const dc = drawCanvasRef.current
    if (!dc) return null

    const xs = strokePoints.map(p => p.x)
    const ys = strokePoints.map(p => p.y)
    const x  = Math.max(0, Math.min(...xs) - 10)
    const y  = Math.max(0, Math.min(...ys) - 10)
    const w  = Math.min(dc.width  - x, Math.max(...xs) - Math.min(...xs) + 20)
    const h  = Math.min(dc.height - y, Math.max(...ys) - Math.min(...ys) + 20)

    if (w <= 0 || h <= 0) return null

    // Create an offscreen canvas with just this stroke's pixels
    const offscreen    = document.createElement('canvas')
    offscreen.width    = w
    offscreen.height   = h
    const offCtx       = offscreen.getContext('2d')
    offCtx.drawImage(dc, x, y, w, h, 0, 0, w, h)
    return { canvas: offscreen, x, y, w, h }
  }, [])

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const hands      = handsRef.current || []
      const drawCanvas = drawCanvasRef.current
      const physCanvas = physCanvasRef.current
      if (!drawCanvas || !physCanvas) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      const W = window.innerWidth
      const H = window.innerHeight

      ;[drawCanvas, physCanvas].forEach(c => {
        if (c.width !== W || c.height !== H) {
          c.width  = W
          c.height = H
        }
      })

      const drawCtx = drawCanvas.getContext('2d')
      const physCtx = physCanvas.getContext('2d')

      frameCount.current++
      const now = performance.now()

      // ── Update and draw physics world ──────────────────────────────────
      physCtx.clearRect(0, 0, W, H)

      // Draw ground line
      physCtx.save()
      physCtx.strokeStyle = 'rgba(255,255,255,0.08)'
      physCtx.lineWidth   = 1
      physCtx.setLineDash([8, 12])
      physCtx.beginPath()
      physCtx.moveTo(0, H - 20)
      physCtx.lineTo(W, H - 20)
      physCtx.stroke()
      physCtx.setLineDash([])
      physCtx.restore()

      worldRef.current.update()
      worldRef.current.draw(physCtx)

      // ── Gesture detection ──────────────────────────────────────────────
      const gestureLabels = {}
      hands.forEach(({ landmarks, handedness }) => {
        const prev    = pinchStates.current[handedness]
        const gesture = getGesture(landmarks, prev)
        pinchStates.current[handedness] = gesture === 'pinch'
        gestureLabels[handedness] = gesture
      })

      // ── Stroke end detection ───────────────────────────────────────────
      Object.keys(wasPinching.current).forEach(side => {
        const isPinchingNow = gestureLabels[side] === 'pinch'

        if (wasPinching.current[side] && !isPinchingNow) {
          // Stroke just ended — capture it and add to physics world
          const penSide = side === 'Left' ? 'Right' : 'Left'
          const path    = strokePathRef.current[penSide] || []

          if (path.length >= 3) {
            const captured = captureStroke(path)

            // Create physics object from this stroke
            const physObj = new PhysicsObject(path, captured?.canvas || null, W, H)
            worldRef.current.addObject(physObj)

            // Clear the drawn stroke from the drawing canvas
            drawCtx.clearRect(0, 0, W, H)
          }

          strokePathRef.current[side]    = []
          strokePathRef.current[penSide] = []
        }

        wasPinching.current[side] = isPinchingNow
      })

      // ── Drawing logic ──────────────────────────────────────────────────
      const pinchingHand = hands.find(h => gestureLabels[h.handedness] === 'pinch')
      const isPinching   = !!pinchingHand

      hands.forEach(({ landmarks, handedness }) => {
        const gesture = gestureLabels[handedness]
        const color   = getCurrentColor(handedness, frameCount.current)

        if (gesture === 'fist') {
          // Fist: clear the draw layer
          drawCtx.clearRect(0, 0, W, H)
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true
          strokePathRef.current[handedness]  = []
          return
        }

        const rawPos = getIndexTipPosition(landmarks, W, H)

        if (isPinching && pinchingHand.handedness !== handedness) {
          const prev = smoothedPoints.current[handedness]

          if (!prev || isFirstPoint.current[handedness]) {
            smoothedPoints.current[handedness] = rawPos
            isFirstPoint.current[handedness]   = false
            strokePathRef.current[handedness]  = [rawPos]
            return
          }

          const smoothedPos = {
            x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
            y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
          }

          strokePathRef.current[handedness].push(smoothedPos)

          // Draw a preview stroke on the drawing canvas
          drawCtx.save()
          drawCtx.strokeStyle = toRgb(color)
          drawCtx.lineWidth   = 4
          drawCtx.lineCap     = 'round'
          drawCtx.shadowColor = toRgb(color)
          drawCtx.shadowBlur  = 12
          drawCtx.beginPath()
          drawCtx.moveTo(prev.x, prev.y)
          drawCtx.lineTo(smoothedPos.x, smoothedPos.y)
          drawCtx.stroke()
          drawCtx.restore()

          smoothedPoints.current[handedness] = smoothedPos

        } else if (!isPinching) {
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true

          // Show cursor
          const pos = getIndexTipPosition(landmarks, W, H)
          physCtx.save()
          physCtx.beginPath()
          physCtx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
          physCtx.fillStyle   = toRgb(color)
          physCtx.shadowColor = toRgb(color)
          physCtx.shadowBlur  = 12
          physCtx.fill()
          physCtx.restore()

        } else {
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true
        }
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, handsRef, captureStroke])

  return (
    <>
      {/* Drawing canvas — temporary stroke preview */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />
      {/* Physics canvas — rendered physics world */}
      <canvas
        ref={physCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 11 }}
      />
    </>
  )
}