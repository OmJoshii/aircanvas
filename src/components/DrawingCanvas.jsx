import { useRef, useEffect, useCallback } from 'react'
import {
  drawStroke,
  drawLightning,
  drawCursor,
  drawEraserIndicator,
  eraseArea,
  getCurrentColor,
} from '../utils/drawingEngine'
import {
  getIndexTipPosition,
  getWristPosition,
  isPeaceSign,
  getPeaceMidpoint,
} from '../utils/gestureUtils'

const ERASER_SIZE    = 35
const MIN_BRUSH       = 4
const MAX_BRUSH       = 40
const SMOOTHING       = 0.5
const RESIZE_SENSITIVITY = 0.15 // how much distance change affects brush size

export default function DrawingCanvas({
  hands,
  gestureLabels,
  onBrushSize,
  onResizeMode,
  clearTrigger,
}) {
  const drawCanvasRef   = useRef(null)
  const uiCanvasRef     = useRef(null)
  const smoothedPoints  = useRef({})
  const isFirstPoint    = useRef({})
  const frameCount      = useRef(0)
  const brushSize       = useRef(14) // locked size, persists across renders
  const resizeStartDist = useRef(null) // distance when resize mode started
  const resizeStartSize = useRef(null) // brush size when resize mode started

  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    smoothedPoints.current = {}
    isFirstPoint.current   = {}
  }, [])

  useEffect(() => {
    if (clearTrigger > 0) clearCanvas()
  }, [clearTrigger, clearCanvas])

  useEffect(() => {
    const drawCanvas = drawCanvasRef.current
    const uiCanvas   = uiCanvasRef.current
    if (!drawCanvas || !uiCanvas) return

    const W = window.innerWidth
    const H = window.innerHeight

    if (drawCanvas.width !== W || drawCanvas.height !== H) {
      const temp = document.createElement('canvas')
      temp.width  = drawCanvas.width
      temp.height = drawCanvas.height
      temp.getContext('2d').drawImage(drawCanvas, 0, 0)
      drawCanvas.width  = W
      drawCanvas.height = H
      drawCanvas.getContext('2d').drawImage(temp, 0, 0)
    }

    uiCanvas.width  = W
    uiCanvas.height = H

    const drawCtx = drawCanvas.getContext('2d')
    const uiCtx   = uiCanvas.getContext('2d')
    uiCtx.clearRect(0, 0, W, H)
    frameCount.current++

    // ── BRUSH RESIZE MODE ──
    // Triggered when BOTH hands show peace sign (index + middle up)
    const allPeaceSign = hands.length === 2 &&
      hands.every(h => isPeaceSign(h.landmarks))

    if (allPeaceSign) {
      const p1 = getPeaceMidpoint(hands[0].landmarks, W, H)
      const p2 = getPeaceMidpoint(hands[1].landmarks, W, H)
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y)

      if (resizeStartDist.current === null) {
        // Just entered resize mode — remember starting distance and size
        resizeStartDist.current = currentDist
        resizeStartSize.current = brushSize.current
      } else {
        // Calculate how much distance changed since entering resize mode
        const delta = (currentDist - resizeStartDist.current) * RESIZE_SENSITIVITY
        const newSize = resizeStartSize.current + delta
        brushSize.current = Math.min(Math.max(newSize, MIN_BRUSH), MAX_BRUSH)
        onBrushSize?.(Math.round(brushSize.current))
      }

      onResizeMode?.(true)

      // Draw a connecting line between the two hands showing the gesture
      uiCtx.save()
      uiCtx.strokeStyle = 'rgba(255,255,255,0.4)'
      uiCtx.lineWidth   = 1.5
      uiCtx.setLineDash([6, 6])
      uiCtx.beginPath()
      uiCtx.moveTo(p1.x, p1.y)
      uiCtx.lineTo(p2.x, p2.y)
      uiCtx.stroke()
      uiCtx.setLineDash([])

      // Show brush size preview circle at midpoint
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      uiCtx.globalAlpha = 0.5
      uiCtx.strokeStyle = '#ffffff'
      uiCtx.beginPath()
      uiCtx.arc(midX, midY, brushSize.current, 0, Math.PI * 2)
      uiCtx.stroke()
      uiCtx.restore()

      // Skip all drawing logic while in resize mode
      return

    } else {
      // Exited resize mode — lock in the current size
      resizeStartDist.current = null
      resizeStartSize.current = null
      onResizeMode?.(false)
    }

    // ── DRAWING LOGIC ──
    const pinchingHand = hands.find(h => gestureLabels[h.handedness] === 'pinch')
    const isPinching    = !!pinchingHand

    hands.forEach(({ landmarks, handedness }) => {
      const gesture = gestureLabels[handedness]
      const color   = getCurrentColor(handedness, frameCount.current)

      if (gesture === 'fist') {
        const pos = getWristPosition(landmarks, W, H)
        eraseArea(drawCtx, pos, ERASER_SIZE)
        drawEraserIndicator(uiCtx, pos, ERASER_SIZE)
        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true
        return
      }

      const rawPos = getIndexTipPosition(landmarks, W, H)

      if (isPinching && pinchingHand.handedness !== handedness) {
        // This hand is the PEN (other hand triggers via pinch)
        const prev = smoothedPoints.current[handedness]

        if (!prev || isFirstPoint.current[handedness]) {
          smoothedPoints.current[handedness] = rawPos
          isFirstPoint.current[handedness]   = false
          drawCursor(uiCtx, rawPos, color, true, brushSize.current)
          return
        }

        const smoothedPos = {
          x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
          y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
        }

        drawStroke(drawCtx, prev, smoothedPos, color, brushSize.current)
        drawLightning(drawCtx, prev, smoothedPos, color, brushSize.current)
        drawCursor(uiCtx, smoothedPos, color, true, brushSize.current)

        smoothedPoints.current[handedness] = smoothedPos

      } else if (!isPinching) {
        drawCursor(uiCtx, rawPos, color, false, brushSize.current)
        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true

      } else {
        // This is the PINCHING hand — show trigger indicator
        const thumbTip = landmarks[4]
        const pinchPos = {
          x: (1 - thumbTip.x) * W,
          y: thumbTip.y * H,
        }
        uiCtx.save()
        uiCtx.globalAlpha = 0.7
        uiCtx.fillStyle   = '#ffffff'
        uiCtx.shadowColor = color
        uiCtx.shadowBlur  = 12
        uiCtx.beginPath()
        uiCtx.arc(pinchPos.x, pinchPos.y, 5, 0, Math.PI * 2)
        uiCtx.fill()
        uiCtx.restore()

        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true
      }
    })

    Object.keys(smoothedPoints.current).forEach(key => {
      if (!hands.find(h => h.handedness === key)) {
        smoothedPoints.current[key] = null
        isFirstPoint.current[key]   = true
      }
    })

  }, [hands, gestureLabels, onBrushSize, onResizeMode])

  return (
    <>
      <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <canvas ref={uiCanvasRef}   className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}