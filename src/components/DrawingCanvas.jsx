import { useRef, useEffect, useCallback } from 'react'
import {
  drawStroke,
  drawSparkles,
  drawCursor,
  drawEraserIndicator,
  eraseArea,
  getCurrentColor,
} from '../utils/drawingEngine'
import { getIndexTipPosition, getWristPosition, getHandSpread } from '../utils/gestureUtils'

const ERASER_SIZE   = 35
const MIN_BRUSH     = 5
const MAX_BRUSH     = 28
const CLEAR_HOLD_MS = 1000 // ms to hold both palms to clear

export default function DrawingCanvas({
  hands,
  gestureLabels,
  onBrushSize,
  clearTrigger,     // increments when canvas should clear
}) {
  const drawCanvasRef = useRef(null) // persistent drawing layer
  const uiCanvasRef   = useRef(null) // live UI layer
  const prevPoints    = useRef({})   // { Left: {x,y}, Right: {x,y} }
  const frameCount    = useRef(0)
  const brushSize     = useRef(12)
  const clearHoldRef  = useRef(null)

  // Clear the drawing canvas
  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    prevPoints.current = {}
  }, [])

  // Clear when clearTrigger changes
  useEffect(() => {
    if (clearTrigger > 0) clearCanvas()
  }, [clearTrigger, clearCanvas])

  // Main render loop — runs every time hands update
  useEffect(() => {
    const drawCanvas = drawCanvasRef.current
    const uiCanvas   = uiCanvasRef.current
    if (!drawCanvas || !uiCanvas) return

    const W = window.innerWidth
    const H = window.innerHeight

    // Set canvas sizes if needed
    if (drawCanvas.width !== W || drawCanvas.height !== H) {
      // Preserve drawing when resizing
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

    // Clear UI layer every frame
    uiCtx.clearRect(0, 0, W, H)

    frameCount.current++

    // ── Brush size from hand spread ──
    if (hands.length === 2) {
      const spread   = getHandSpread(hands[0].landmarks, hands[1].landmarks)
      const newBrush = Math.round(MIN_BRUSH + spread * (MAX_BRUSH - MIN_BRUSH) * 2.5)
      brushSize.current = Math.min(Math.max(newBrush, MIN_BRUSH), MAX_BRUSH)
      onBrushSize?.(brushSize.current)
    }

    // ── Process each hand ──
    hands.forEach(({ landmarks, handedness }) => {
      const gesture = gestureLabels[handedness]
      const color   = getCurrentColor(handedness, frameCount.current)
      const key     = handedness

      if (gesture === 'fist') {
        // ── Erase mode ──
        const pos = getWristPosition(landmarks, W, H)
        eraseArea(drawCtx, pos, ERASER_SIZE)
        drawEraserIndicator(uiCtx, pos, ERASER_SIZE)
        prevPoints.current[key] = null

      } else if (gesture === 'pinch') {
        // ── Draw mode ──
        const pos  = getIndexTipPosition(landmarks, W, H)
        const prev = prevPoints.current[key]

        if (prev) {
          // Draw the aesthetic stroke
          drawStroke(drawCtx, prev, pos, color, brushSize.current)
          // Add sparkles on the drawing canvas too
          drawSparkles(drawCtx, pos, color, brushSize.current)
        }

        // Show cursor on UI layer
        drawCursor(uiCtx, pos, color, true, brushSize.current)
        prevPoints.current[key] = pos

      } else {
        // ── Neutral / open — show cursor only ──
        const pos = getIndexTipPosition(landmarks, W, H)
        drawCursor(uiCtx, pos, color, false, brushSize.current)
        prevPoints.current[key] = null
      }
    })

    // Clear prev points for hands no longer detected
    Object.keys(prevPoints.current).forEach(key => {
      if (!hands.find(h => h.handedness === key)) {
        prevPoints.current[key] = null
      }
    })

  }, [hands, gestureLabels, onBrushSize])

  return (
    <>
      {/* Persistent drawing layer */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Live UI layer */}
      <canvas
        ref={uiCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </>
  )
}