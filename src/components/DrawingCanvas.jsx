import { useRef, useEffect, useCallback } from 'react'
import {
  drawStroke,
  drawSparkles,
  drawCursor,
  drawEraserIndicator,
  eraseArea,
  getCurrentColor,
} from '../utils/drawingEngine'
import {
  getIndexTipPosition,
  getWristPosition,
  getHandSpread,
} from '../utils/gestureUtils'

const ERASER_SIZE = 35
const MIN_BRUSH   = 5
const MAX_BRUSH   = 28

// Smoothing factor — higher = smoother but more lag (0.3 to 0.7 is good)
const SMOOTHING   = 0.5

export default function DrawingCanvas({
  hands,
  gestureLabels,
  onBrushSize,
  clearTrigger,
}) {
  const drawCanvasRef  = useRef(null)
  const uiCanvasRef    = useRef(null)
  const smoothedPoints = useRef({})   // smoothed positions per hand
  const frameCount     = useRef(0)
  const brushSize      = useRef(12)
  const isFirstPoint   = useRef({})   // track if this is the first point of a new stroke

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

    // ── Brush size from hand spread ──
    if (hands.length === 2) {
      const spread      = getHandSpread(hands[0].landmarks, hands[1].landmarks)
      const newBrush    = Math.round(MIN_BRUSH + spread * (MAX_BRUSH - MIN_BRUSH) * 2.5)
      brushSize.current = Math.min(Math.max(newBrush, MIN_BRUSH), MAX_BRUSH)
      onBrushSize?.(brushSize.current)
    }

    // ── Figure out which hand is trigger and which is pen ──
    // The hand that is PINCHING is the trigger
    // The OTHER hand is the pen (drawing point)

    const pinchingHand  = hands.find(h => gestureLabels[h.handedness] === 'pinch')
    const fistHand      = hands.find(h => gestureLabels[h.handedness] === 'fist')
    const isPinching    = !!pinchingHand

    // The pen hand is whichever hand is NOT pinching
    // If only one hand → that hand controls everything (fist=erase, else cursor)
    // If two hands → pinching hand = trigger, other hand = pen

    hands.forEach(({ landmarks, handedness }) => {
      const gesture = gestureLabels[handedness]
      const color   = getCurrentColor(handedness, frameCount.current)

      if (gesture === 'fist') {
        // ── Erase mode ──
        const pos = getWristPosition(landmarks, W, H)
        eraseArea(drawCtx, pos, ERASER_SIZE)
        drawEraserIndicator(uiCtx, pos, ERASER_SIZE)
        // Reset this hand's drawing state
        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true
        return
      }

      // Get this hand's current raw position
      const rawPos = getIndexTipPosition(landmarks, W, H)

      if (isPinching && pinchingHand.handedness !== handedness) {
        // ── This is the PEN hand (other hand is pinching) ──

        // Smooth the position to prevent dotted lines
        const prev = smoothedPoints.current[handedness]

        let smoothedPos
        if (!prev || isFirstPoint.current[handedness]) {
          // First point of stroke — start here, don't draw yet
          smoothedPos = rawPos
          isFirstPoint.current[handedness] = false
          smoothedPoints.current[handedness] = smoothedPos
          // Show cursor but don't draw
          drawCursor(uiCtx, smoothedPos, color, true, brushSize.current)
          return
        }

        // Lerp between previous smoothed position and new raw position
        // This fills gaps and prevents dots
        smoothedPos = {
          x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
          y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
        }

        // Draw stroke from previous smoothed to new smoothed
        drawStroke(drawCtx, prev, smoothedPos, color, brushSize.current)
        drawSparkles(drawCtx, smoothedPos, color, brushSize.current)
        drawCursor(uiCtx, smoothedPos, color, true, brushSize.current)

        smoothedPoints.current[handedness] = smoothedPos

      } else if (!isPinching) {
        // ── No pinch active — show cursor only, reset stroke ──
        drawCursor(uiCtx, rawPos, color, false, brushSize.current)
        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true

      } else {
        // ── This is the PINCHING hand — show small pinch indicator ──
        const thumbTip = landmarks[4]
        const pinchPos = {
          x: (1 - thumbTip.x) * W,
          y: thumbTip.y * H,
        }
        // Small white dot at pinch point to indicate trigger
        uiCtx.save()
        uiCtx.globalAlpha = 0.7
        uiCtx.fillStyle   = '#ffffff'
        uiCtx.shadowColor = color
        uiCtx.shadowBlur  = 12
        uiCtx.beginPath()
        uiCtx.arc(pinchPos.x, pinchPos.y, 5, 0, Math.PI * 2)
        uiCtx.fill()
        uiCtx.restore()

        // Reset this hand's drawing state since it's the trigger
        smoothedPoints.current[handedness] = null
        isFirstPoint.current[handedness]   = true
      }
    })

    // Reset state for hands no longer detected
    Object.keys(smoothedPoints.current).forEach(key => {
      if (!hands.find(h => h.handedness === key)) {
        smoothedPoints.current[key] = null
        isFirstPoint.current[key]   = true
      }
    })

  }, [hands, gestureLabels, onBrushSize])

  return (
    <>
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <canvas
        ref={uiCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </>
  )
}