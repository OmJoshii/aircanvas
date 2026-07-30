import { useRef, useEffect, useCallback } from 'react'
import { getIndexTipPosition, getGesture } from '../utils/gestureUtils'
import { getCurrentColor, toRgb }          from '../utils/drawingEngine'
import { EcosystemWorld, classifyEcosystemSymbol } from '../utils/ecosystemEngine'

const SMOOTHING = 0.45

export default function EcosystemCanvas({ handsRef, isActive, clearTrigger }) {
  const canvasRef      = useRef(null)
  const guideCanvasRef = useRef(null)  // shows drawing guide before committing
  const animFrameRef   = useRef(null)
  const smoothedPoints = useRef({})
  const isFirstPoint   = useRef({})
  const strokePathRef  = useRef({})
  const wasPinching    = useRef({ Left: false, Right: false })
  const pinchStates    = useRef({ Left: false, Right: false })
  const frameCount     = useRef(0)
  const worldRef       = useRef(null)

  const clearAll = useCallback(() => {
    worldRef.current?.clear()
    const gc = guideCanvasRef.current
    if (gc) gc.getContext('2d').clearRect(0, 0, gc.width, gc.height)
  }, [])

  useEffect(() => {
    if (clearTrigger > 0) clearAll()
  }, [clearTrigger, clearAll])

  useEffect(() => {
    if (!isActive) return

    const W = window.innerWidth
    const H = window.innerHeight
    worldRef.current = new EcosystemWorld(W, H)

    function loop() {
      const hands      = handsRef.current || []
      const canvas     = canvasRef.current
      const guideCanvas = guideCanvasRef.current
      if (!canvas || !guideCanvas) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      const W = window.innerWidth
      const H = window.innerHeight

      ;[canvas, guideCanvas].forEach(c => {
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
      })

      const ctx      = canvas.getContext('2d')
      const guideCtx = guideCanvas.getContext('2d')

      frameCount.current++
      guideCtx.clearRect(0, 0, W, H)

      // ── Draw background gradient (sky) ─────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0, 'rgba(15,23,42,0.0)')
      skyGrad.addColorStop(1, 'rgba(15,23,42,0.0)')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)

      // ── Ground ────────────────────────────────────────────────────────
      const groundY = H - 30
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, H)
      groundGrad.addColorStop(0, 'rgba(92,64,51,0.6)')
      groundGrad.addColorStop(1, 'rgba(62,42,33,0.8)')
      ctx.fillStyle = groundGrad
      ctx.fillRect(0, groundY, W, H - groundY)

      // ── Update and draw ecosystem ──────────────────────────────────────
      worldRef.current.W = W
      worldRef.current.H = H
      worldRef.current.groundY = groundY
      worldRef.current.update()
      worldRef.current.draw(ctx)

      // ── Gesture detection ──────────────────────────────────────────────
      const gestureLabels = {}
      hands.forEach(({ landmarks, handedness }) => {
        const prev    = pinchStates.current[handedness]
        const gesture = getGesture(landmarks, prev)
        pinchStates.current[handedness] = gesture === 'pinch'
        gestureLabels[handedness] = gesture
      })

      // ── Stroke end → classify and spawn ────────────────────────────────
      Object.keys(wasPinching.current).forEach(side => {
        const isPinchingNow = gestureLabels[side] === 'pinch'

        if (wasPinching.current[side] && !isPinchingNow) {
          const penSide = side === 'Left' ? 'Right' : 'Left'
          const path    = strokePathRef.current[penSide] || []

          if (path.length >= 3) {
            const symbol = classifyEcosystemSymbol(path, W, H)
            console.log('Ecosystem symbol:', symbol?.type || 'unknown')

            if (symbol) {
              const world = worldRef.current
              switch (symbol.type) {
                case 'cloud':  world.addCloud(symbol.x, symbol.y);  break
                case 'sun':    world.addSun(symbol.x, symbol.y);    break
                case 'river':  world.addRiver(symbol.y);             break
                case 'tree':   world.spawnTree(symbol.x);            break
                case 'seed':   world.spawnFlower(symbol.x);          break
                case 'rain':
                  // Spawn a burst of rain drops at the stroke location
                  for (let i = 0; i < 12; i++) {
                    const rx = symbol.x + (Math.random() - 0.5) * 80
                    world.addRainDrop(rx, symbol.y)
                  }
                  // Also add a small cloud above
                  world.addCloud(symbol.x, symbol.y - 40)
                  break
              }
            }
            // Clear guide
            guideCtx.clearRect(0, 0, W, H)
          }

          strokePathRef.current[side]    = []
          strokePathRef.current[penSide] = []
        }

        wasPinching.current[side] = isPinchingNow
      })

      // ── Drawing (guide preview) ────────────────────────────────────────
      const pinchingHand = hands.find(h => gestureLabels[h.handedness] === 'pinch')
      const isPinching   = !!pinchingHand

      hands.forEach(({ landmarks, handedness }) => {
        const gesture = gestureLabels[handedness]
        const color   = getCurrentColor(handedness, frameCount.current)
        const rawPos  = getIndexTipPosition(landmarks, W, H)

        if (gesture === 'fist') {
          guideCtx.clearRect(0, 0, W, H)
          strokePathRef.current[handedness] = []
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true
          return
        }

        if (isPinching && pinchingHand.handedness !== handedness) {
          const prev = smoothedPoints.current[handedness]

          if (!prev || isFirstPoint.current[handedness]) {
            smoothedPoints.current[handedness] = rawPos
            isFirstPoint.current[handedness]   = false
            strokePathRef.current[handedness]  = [rawPos]
            return
          }

          const sp = {
            x: prev.x + (rawPos.x - prev.x) * (1 - SMOOTHING),
            y: prev.y + (rawPos.y - prev.y) * (1 - SMOOTHING),
          }

          strokePathRef.current[handedness].push(sp)

          // Draw guide stroke
          guideCtx.save()
          guideCtx.strokeStyle = toRgb(color)
          guideCtx.lineWidth   = 3
          guideCtx.lineCap     = 'round'
          guideCtx.shadowColor = toRgb(color)
          guideCtx.shadowBlur  = 10
          guideCtx.globalAlpha = 0.7
          guideCtx.beginPath()
          guideCtx.moveTo(prev.x, prev.y)
          guideCtx.lineTo(sp.x, sp.y)
          guideCtx.stroke()
          guideCtx.restore()

          smoothedPoints.current[handedness] = sp

        } else if (!isPinching) {
          smoothedPoints.current[handedness] = null
          isFirstPoint.current[handedness]   = true

          // Cursor dot
          guideCtx.save()
          guideCtx.beginPath()
          guideCtx.arc(rawPos.x, rawPos.y, 6, 0, Math.PI * 2)
          guideCtx.fillStyle   = toRgb(color)
          guideCtx.shadowColor = toRgb(color)
          guideCtx.shadowBlur  = 10
          guideCtx.fill()
          guideCtx.restore()

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
  }, [isActive, handsRef])

  return (
    <>
      <canvas ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }} />
      <canvas ref={guideCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 11 }} />
    </>
  )
}