import { useRef, useEffect, useState } from 'react'
import { BRUSHES, hexToRgb } from '../utils/drawingEngine'
import { getIndexTipPosition } from '../utils/gestureUtils'

const COLOR_PALETTE = [
  '#818cf8', '#a78bfa', '#f472b6', '#fb923c',
  '#fbbf24', '#34d399', '#22d3ee', '#f87171',
  '#ffffff', '#000000',
]

const DWELL_MS = 600

export default function BrushPicker({
  handsRef,
  isActive,
  currentBrush,
  currentColor,
  onBrushChange,
  onColorChange,
  onClose,
}) {
  const canvasRef    = useRef(null)
  const animFrameRef = useRef(null)
  const dwellRef     = useRef({ id: null, startTime: null })
  const lastTrigger  = useRef(null)

  const [hoveredId, setHoveredId] = useState(null)

  // Build all selectable items with screen positions
  function buildItems(W, H) {
    const items = []
    const panelW = 340
    const panelX = (W - panelW) / 2
    let y = H * 0.15

    // Brush style items — 3 per row
    const colCount = 3
    const itemW    = 90
    const itemH    = 56
    const itemGap  = 10

    BRUSHES.forEach((brush, i) => {
      const col = i % colCount
      const row = Math.floor(i / colCount)
      const x   = panelX + col * (itemW + itemGap)
      const iy  = y + row * (itemH + itemGap)
      items.push({
        id:    `brush:${brush.id}`,
        type:  'brush',
        value: brush.id,
        label: brush.icon,
        sub:   brush.label,
        x, y: iy, w: itemW, h: itemH,
        active: currentBrush === brush.id,
      })
    })

    // Color items — 5 per row
    y += Math.ceil(BRUSHES.length / colCount) * (itemH + itemGap) + 24
    const colorW   = 44
    const colorGap = 8
    const colorsPerRow = 5
    COLOR_PALETTE.forEach((hex, i) => {
      const col = i % colorsPerRow
      const row = Math.floor(i / colorsPerRow)
      const x   = panelX + col * (colorW + colorGap)
      const iy  = y + row * (colorW + colorGap)
      items.push({
        id:    `color:${hex}`,
        type:  'color',
        value: hex,
        x, y: iy, w: colorW, h: colorW,
        active: currentColor === hex,
      })
    })

    // Close button
    const closeY = y + Math.ceil(COLOR_PALETTE.length / colorsPerRow) * (colorW + colorGap) + 16
    items.push({
      id:    'close',
      type:  'close',
      label: '✕ Close',
      x: panelX, y: closeY, w: panelW, h: 40,
    })

    return items
  }

  useEffect(() => {
    if (!isActive) return

    function loop() {
      const hands  = handsRef.current || []
      const canvas = canvasRef.current
      if (!canvas) { animFrameRef.current = requestAnimationFrame(loop); return }

      const W = window.innerWidth
      const H = window.innerHeight
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }

      const ctx   = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)

      const items = buildItems(W, H)
      const now   = performance.now()

      let fingerPos = null
      for (const hand of hands) { fingerPos = getIndexTipPosition(hand.landmarks, W, H); break }

      // Find hovered item
      let hovering = null
      if (fingerPos) {
        for (const item of items) {
          if (fingerPos.x >= item.x && fingerPos.x <= item.x + item.w &&
              fingerPos.y >= item.y && fingerPos.y <= item.y + item.h) {
            hovering = item; break
          }
        }
      }

      // Dwell tracking
      if (hovering) {
        if (dwellRef.current.id !== hovering.id) {
          dwellRef.current = { id: hovering.id, startTime: now }
          lastTrigger.current = null
        }
        const elapsed  = now - dwellRef.current.startTime
        const progress = Math.min(elapsed / DWELL_MS, 1)

        if (progress >= 1 && lastTrigger.current !== hovering.id) {
          lastTrigger.current = hovering.id
          if (hovering.type === 'brush') onBrushChange(hovering.value)
          else if (hovering.type === 'color') onColorChange(hovering.value)
          else if (hovering.type === 'close') onClose()
          dwellRef.current = { id: hovering.id, startTime: now + 500 }
        }

        setHoveredId(hovering.id)
      } else {
        dwellRef.current = { id: null, startTime: null }
        setHoveredId(null)
      }

      // ── Draw panel background ────────────────────────────────────────
      const panelW = 340
      const panelX = (W - panelW) / 2
      const allItems = items
      const lastItem = allItems[allItems.length - 1]
      const panelH   = (lastItem.y + lastItem.h) - H * 0.12

      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle   = '#0e0e1a'
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth   = 1
      roundRect(ctx, panelX - 16, H * 0.12, panelW + 32, panelH + 32, 20)
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // Section labels
      ctx.save()
      ctx.fillStyle   = 'rgba(255,255,255,0.35)'
      ctx.font        = '11px Inter, system-ui, sans-serif'
      ctx.textAlign   = 'left'
      ctx.fillText('BRUSH STYLE', panelX, H * 0.15 - 10)

      const brushRows = Math.ceil(BRUSHES.length / 3)
      const colorY    = H * 0.15 + brushRows * 66 + 14
      ctx.fillText('COLOR', panelX, colorY)
      ctx.restore()

      // ── Draw items ────────────────────────────────────────────────────
      items.forEach(item => {
        const isHovered = hovering?.id === item.id
        const isDwell   = isHovered && dwellRef.current.startTime
        const progress  = isDwell
          ? Math.min((now - dwellRef.current.startTime) / DWELL_MS, 1)
          : 0

        ctx.save()

        if (item.type === 'brush') {
          const isActive = item.active

          ctx.fillStyle   = isActive
            ? 'rgba(167,139,250,0.35)'
            : isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'
          ctx.strokeStyle = isActive ? '#a78bfa'
            : isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'
          ctx.lineWidth   = isActive ? 2 : 1

          roundRect(ctx, item.x, item.y, item.w, item.h, 10)
          ctx.fill(); ctx.stroke()

          // Dwell arc
          if (isHovered && progress > 0) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth   = 2.5
            ctx.shadowColor = '#a78bfa'
            ctx.shadowBlur  = 8
            ctx.beginPath()
            ctx.arc(item.x + item.w - 10, item.y + 10, 7, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2)
            ctx.stroke()
          }

          ctx.font        = '22px serif'
          ctx.textAlign   = 'center'
          ctx.fillStyle   = '#ffffff'
          ctx.shadowBlur  = 0
          ctx.fillText(item.label, item.x + item.w / 2, item.y + item.h / 2 - 4)

          ctx.font        = '9px Inter, system-ui, sans-serif'
          ctx.fillStyle   = isActive ? '#a78bfa' : 'rgba(255,255,255,0.45)'
          ctx.fillText(item.sub, item.x + item.w / 2, item.y + item.h - 8)

        } else if (item.type === 'color') {
          const isActive = item.active

          // Color swatch
          ctx.fillStyle   = item.value
          ctx.strokeStyle = isActive ? '#ffffff'
            : isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)'
          ctx.lineWidth   = isActive ? 3 : 1.5
          roundRect(ctx, item.x, item.y, item.w, item.h, item.w / 2)
          ctx.fill(); ctx.stroke()

          // Active checkmark
          if (isActive) {
            ctx.fillStyle = item.value === '#ffffff' ? '#000000' : '#ffffff'
            ctx.font      = '14px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('✓', item.x + item.w / 2, item.y + item.h / 2 + 5)
          }

          // Dwell arc on color
          if (isHovered && progress > 0) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth   = 2
            ctx.beginPath()
            ctx.arc(item.x + item.w/2, item.y + item.h/2, item.w/2 + 4, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2)
            ctx.stroke()
          }

        } else if (item.type === 'close') {
          ctx.fillStyle   = isHovered ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'
          ctx.strokeStyle = isHovered ? '#ef4444' : 'rgba(255,255,255,0.1)'
          ctx.lineWidth   = 1
          roundRect(ctx, item.x, item.y, item.w, item.h, 8)
          ctx.fill(); ctx.stroke()

          ctx.fillStyle = isHovered ? '#ef4444' : 'rgba(255,255,255,0.4)'
          ctx.font      = '13px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(item.label, item.x + item.w / 2, item.y + item.h / 2 + 4)

          if (isHovered && progress > 0) {
            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth   = 2
            ctx.beginPath()
            ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 16, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2)
            ctx.stroke()
          }
        }

        ctx.restore()
      })

      // Fingertip cursor
      if (fingerPos) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(fingerPos.x, fingerPos.y, 8, 0, Math.PI * 2)
        ctx.fillStyle   = '#a78bfa'
        ctx.shadowColor = '#a78bfa'
        ctx.shadowBlur  = 12
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [isActive, handsRef, currentBrush, currentColor, onBrushChange, onColorChange, onClose])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-40 pointer-events-none"
    />
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}