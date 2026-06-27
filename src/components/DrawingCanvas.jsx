import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  drawStroke,
  drawLightning,
  drawCursor,
  drawEraserIndicator,
  eraseArea,
  getCurrentColor,
  hexToRgb,
  toRgb,
} from '../utils/drawingEngine'
import {
  getIndexTipPosition,
  getWristPosition,
  isPeaceSign,
  getPeaceMidpoint,
  getGesture,
} from '../utils/gestureUtils'
import { getAccessibilitySettings } from '../utils/accessibilitySettings'

const ERASER_SIZE        = 50
const MIN_BRUSH          = 4
const MAX_BRUSH          = 40
const SMOOTHING          = 0.5
const RESIZE_SENSITIVITY = 0.15
const CLEAR_HOLD_MS      = 3000

const DrawingCanvas = forwardRef(function DrawingCanvas({
  handsRef,
  onBrushSize,
  onResizeMode,
  onClearProgress,
  onAutoClear,
  clearTrigger,
  isActive,
  brushId,
  customColor,
}, ref) {
  const drawCanvasRef   = useRef(null)
  const uiCanvasRef     = useRef(null)
  const smoothedPoints  = useRef({})
  const isFirstPoint    = useRef({})
  const frameCount      = useRef(0)
  const brushSize       = useRef(14)
  const resizeStartDist = useRef(null)
  const resizeStartSize = useRef(null)
  const pinchStates     = useRef({ Left: false, Right: false })
  const animFrameRef    = useRef(null)
  const brushIdRef    = useRef('neon')
  const customColorRef = useRef(null)

  const undoStack      = useRef([])
  const wasPinching    = useRef({ Left: false, Right: false })
  const MAX_UNDO_STEPS = 15

  const lastReportedBrush    = useRef(14)
  const lastReportedResize   = useRef(false)
  const bothPalmStart        = useRef(null)
  const lastReportedProgress = useRef(0)
  const hasTriggeredClear    = useRef(false)

  const dwellDrawRef  = useRef({ handedness: null, startTime: null })

  brushIdRef.current    = brushId
  customColorRef.current = customColor

  const saveUndoSnapshot = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
      undoStack.current.push(snapshot)
      if (undoStack.current.length > MAX_UNDO_STEPS) {
        undoStack.current.shift()
      }
    } catch (e) {
      // ignore — can fail on zero-size canvas during init
    }
  }, [])

  const undo = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas || undoStack.current.length === 0) return
    const ctx = canvas.getContext('2d')
    const snapshot = undoStack.current.pop()
    ctx.putImageData(snapshot, 0, 0)
  }, [])

  const saveImage = useCallback((videoElement) => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return

    // Create a temporary canvas to composite everything together
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width  = drawCanvas.width
    exportCanvas.height = drawCanvas.height
    const exportCtx = exportCanvas.getContext('2d')

    // Fill with dark background first (matches app background)
    exportCtx.fillStyle = '#07070f'
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

    // Draw the dimmed mirrored video underneath, if available
    if (videoElement && videoElement.videoWidth > 0) {
      exportCtx.save()
      exportCtx.globalAlpha = 0.25
      // Mirror to match what the user sees on screen
      exportCtx.translate(exportCanvas.width, 0)
      exportCtx.scale(-1, 1)
      exportCtx.drawImage(videoElement, 0, 0, exportCanvas.width, exportCanvas.height)
      exportCtx.restore()
    }

    // Draw the actual artwork on top
    exportCtx.drawImage(drawCanvas, 0, 0)

    // Trigger download
    const dataUrl = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `aircanvas-${Date.now()}.png`
    link.click()
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    saveUndoSnapshot()
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    smoothedPoints.current = {}
    isFirstPoint.current   = {}
  }, [saveUndoSnapshot])

  useEffect(() => {
    if (clearTrigger > 0) clearCanvas()
  }, [clearTrigger, clearCanvas])

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const hands      = handsRef.current || []
      const drawCanvas = drawCanvasRef.current
      const uiCanvas   = uiCanvasRef.current
      const now        = performance.now()

      if (!drawCanvas || !uiCanvas) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

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

      // ── Compute gesture for each hand locally ──
      const gestureLabels = {}
      hands.forEach(({ landmarks, handedness }) => {
        const prev = pinchStates.current[handedness]
        const gesture = getGesture(landmarks, prev)
        pinchStates.current[handedness] = gesture === 'pinch'
        gestureLabels[handedness] = gesture
      })

      // Detect any hand that just stopped pinching (stroke ended) — save undo
      Object.keys(wasPinching.current).forEach(side => {
        const isPinchingNow = gestureLabels[side] === 'pinch'
        if (wasPinching.current[side] && !isPinchingNow) {
          saveUndoSnapshot()
        }
        wasPinching.current[side] = isPinchingNow
      })

      // ── BOTH PALMS OPEN — hold to clear ──
      const bothPalmsOpen = hands.length === 2 &&
        hands.every(h => gestureLabels[h.handedness] === 'open')

      if (bothPalmsOpen) {
        if (!bothPalmStart.current) {
          bothPalmStart.current = performance.now()
          hasTriggeredClear.current = false
        }

        const elapsed  = performance.now() - bothPalmStart.current
        const progress = Math.min(elapsed / CLEAR_HOLD_MS, 1)

        const rounded = Math.round(progress * 100)
        if (rounded !== lastReportedProgress.current) {
          lastReportedProgress.current = rounded
          onClearProgress?.(progress)
        }

        if (progress >= 1 && !hasTriggeredClear.current) {
          hasTriggeredClear.current = true
          saveUndoSnapshot()
          onAutoClear?.()
          drawCtx.clearRect(0, 0, W, H)
          smoothedPoints.current = {}
          isFirstPoint.current   = {}
        }

        const wrist1 = hands[0].landmarks[0]
        const wrist2 = hands[1].landmarks[0]
        const midX = ((1 - wrist1.x) * W + (1 - wrist2.x) * W) / 2
        const midY = (wrist1.y * H + wrist2.y * H) / 2

        uiCtx.save()
        uiCtx.strokeStyle = 'rgba(52,211,153,0.2)'
        uiCtx.lineWidth   = 4
        uiCtx.beginPath()
        uiCtx.arc(midX, midY, 30, 0, Math.PI * 2)
        uiCtx.stroke()

        uiCtx.strokeStyle = '#34d399'
        uiCtx.lineWidth   = 4
        uiCtx.shadowColor = '#34d399'
        uiCtx.shadowBlur  = 12
        uiCtx.beginPath()
        uiCtx.arc(midX, midY, 30, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
        uiCtx.stroke()
        uiCtx.restore()

      } else {
        bothPalmStart.current = null
        hasTriggeredClear.current = false
        if (lastReportedProgress.current !== 0) {
          lastReportedProgress.current = 0
          onClearProgress?.(0)
        }
      }

      // ── BRUSH RESIZE MODE ──
      const allPeaceSign = hands.length === 2 &&
        hands.every(h => isPeaceSign(h.landmarks))

      if (allPeaceSign) {
        const p1 = getPeaceMidpoint(hands[0].landmarks, W, H)
        const p2 = getPeaceMidpoint(hands[1].landmarks, W, H)
        const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y)

        if (resizeStartDist.current === null) {
          resizeStartDist.current = currentDist
          resizeStartSize.current = brushSize.current
        } else {
          const delta   = (currentDist - resizeStartDist.current) * RESIZE_SENSITIVITY
          const newSize = resizeStartSize.current + delta
          brushSize.current = Math.min(Math.max(newSize, MIN_BRUSH), MAX_BRUSH)

          const rounded = Math.round(brushSize.current)
          if (rounded !== lastReportedBrush.current) {
            lastReportedBrush.current = rounded
            onBrushSize?.(rounded)
          }
        }

        if (!lastReportedResize.current) {
          lastReportedResize.current = true
          onResizeMode?.(true)
        }

        uiCtx.save()
        uiCtx.strokeStyle = 'rgba(255,255,255,0.4)'
        uiCtx.lineWidth   = 1.5
        uiCtx.setLineDash([6, 6])
        uiCtx.beginPath()
        uiCtx.moveTo(p1.x, p1.y)
        uiCtx.lineTo(p2.x, p2.y)
        uiCtx.stroke()
        uiCtx.setLineDash([])

        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        uiCtx.globalAlpha = 0.5
        uiCtx.strokeStyle = '#ffffff'
        uiCtx.beginPath()
        uiCtx.arc(midX, midY, brushSize.current, 0, Math.PI * 2)
        uiCtx.stroke()
        uiCtx.restore()

        animFrameRef.current = requestAnimationFrame(loop)
        return

      } else {
        resizeStartDist.current = null
        resizeStartSize.current = null
        if (lastReportedResize.current) {
          lastReportedResize.current = false
          onResizeMode?.(false)
        }
      }

      // ── DRAWING LOGIC ──
      const a11y         = getAccessibilitySettings()
      const cursorSize   = a11y.largerCursor ? brushSize.current * 1.8 : brushSize.current
      const pinchingHand = hands.find(h => gestureLabels[h.handedness] === 'pinch')
      const isPinching   = !!pinchingHand

      hands.forEach(({ landmarks, handedness }) => {
        const gesture = gestureLabels[handedness]
        const color   = getCurrentColor(handedness, frameCount.current)
        const strokeColor = customColorRef.current
          ? hexToRgb(customColorRef.current)
          : color

        if (gesture === 'fist') {
          const pos = getWristPosition(landmarks, W, H)
          eraseArea(drawCtx, pos, ERASER_SIZE)
          drawEraserIndicator(uiCtx, pos, ERASER_SIZE)
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true
          return
        }

        const rawPos = getIndexTipPosition(landmarks, W, H)

        // ── Dwell to draw mode ──
        if (a11y.dwellToDraw) {
          const dwell   = dwellDrawRef.current
          const isStill = dwell.handedness === handedness &&
            dwell.lastPos &&
            Math.hypot(rawPos.x - dwell.lastPos.x, rawPos.y - dwell.lastPos.y) < 15

          if (!isStill) {
            dwellDrawRef.current = { handedness, startTime: now, lastPos: rawPos }
          } else {
            const dwellElapsed = now - dwell.startTime
            const dwellActive  = dwellElapsed > a11y.dwellDrawMs

            if (dwellActive) {
              // Treat as if pinching — draw at this hand's fingertip
              const prev = smoothedPoints.current[handedness]
              if (!prev || isFirstPoint.current[handedness]) {
                smoothedPoints.current[handedness] = rawPos
                isFirstPoint.current[handedness]   = false
              } else {
                const smoothedPos = {
                  x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
                  y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
                }
                drawStroke(drawCtx, prev, smoothedPos, strokeColor, brushSize.current, brushIdRef.current, frameCount.current)
                drawCursor(uiCtx, smoothedPos, color, true, cursorSize)
                smoothedPoints.current[handedness] = smoothedPos
              }
              return
            }

            // Show dwell progress ring
            const progress = Math.min((now - dwell.startTime) / a11y.dwellDrawMs, 1)
            uiCtx.save()
            uiCtx.strokeStyle = toRgb(color)
            uiCtx.lineWidth   = 3
            uiCtx.shadowColor = toRgb(color)
            uiCtx.shadowBlur  = 8
            uiCtx.beginPath()
            uiCtx.arc(rawPos.x, rawPos.y, cursorSize + 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
            uiCtx.stroke()
            uiCtx.restore()
          }

          drawCursor(uiCtx, rawPos, color, false, cursorSize)
          return
        }

        // ── One-handed mode ──
        if (a11y.oneHandedMode) {
          if (gesture === 'pinch') {
            const prev = smoothedPoints.current[handedness]
            if (!prev || isFirstPoint.current[handedness]) {
              smoothedPoints.current[handedness] = rawPos
              isFirstPoint.current[handedness]   = false
              drawCursor(uiCtx, rawPos, color, true, cursorSize)
              return
            }
            const smoothedPos = {
              x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
              y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
            }
            drawStroke(drawCtx, prev, smoothedPos, strokeColor, brushSize.current, brushIdRef.current, frameCount.current)
            drawLightning(drawCtx, prev, smoothedPos, strokeColor, brushSize.current)
            drawCursor(uiCtx, smoothedPos, color, true, cursorSize)
            smoothedPoints.current[handedness] = smoothedPos
          } else {
            drawCursor(uiCtx, rawPos, color, false, cursorSize)
            smoothedPoints.current[handedness] = null
            isFirstPoint.current[handedness]   = true
          }
          return
        }

        // ── Normal two-handed mode ──
        if (isPinching && pinchingHand.handedness !== handedness) {
          const prev = smoothedPoints.current[handedness]
          if (!prev || isFirstPoint.current[handedness]) {
            smoothedPoints.current[handedness] = rawPos
            isFirstPoint.current[handedness]   = false
            drawCursor(uiCtx, rawPos, color, true, cursorSize)
            return
          }
          const smoothedPos = {
            x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
            y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
          }
          drawStroke(drawCtx, prev, smoothedPos, strokeColor, brushSize.current, brushIdRef.current, frameCount.current)
          drawLightning(drawCtx, prev, smoothedPos, strokeColor, brushSize.current)
          drawCursor(uiCtx, smoothedPos, color, true, cursorSize)
          smoothedPoints.current[handedness] = smoothedPos

        } else if (!isPinching) {
          drawCursor(uiCtx, rawPos, color, false, cursorSize)
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true

        } else {
          const thumbTip = landmarks[4]
          const pinchPos = { x: (1 - thumbTip.x) * W, y: thumbTip.y * H }
          uiCtx.save()
          uiCtx.globalAlpha = 0.7
          uiCtx.fillStyle   = '#ffffff'
          uiCtx.shadowColor = toRgb(color)
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

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isActive, handsRef, onBrushSize, onResizeMode, onClearProgress, onAutoClear, saveUndoSnapshot])

  useImperativeHandle(ref, () => ({
    undo,
    saveImage,
    canUndo: () => undoStack.current.length > 0,
  }))

  return (
    <>
      <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <canvas ref={uiCanvasRef}   className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
})

export default DrawingCanvas