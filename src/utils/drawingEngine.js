// ─── Color palettes ────────────────────────────────────────────────────
export const PALETTES = {
  Left: [
    { r: 129, g: 140, b: 248 }, // indigo
    { r: 167, g: 139, b: 250 }, // violet
    { r: 34,  g: 211, b: 238 }, // cyan
    { r: 96,  g: 165, b: 250 }, // blue
    { r: 192, g: 132, b: 252 }, // purple
  ],
  Right: [
    { r: 244, g: 114, b: 182 }, // pink
    { r: 251, g: 146, b: 60  }, // orange
    { r: 251, g: 191, b: 36  }, // amber
    { r: 232, g: 121, b: 249 }, // fuchsia
    { r: 248, g: 113, b: 113 }, // red
  ],
}

// ─── Interpolate between two RGB colors ───────────────────────────────
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  }
}

function toRgb(c, alpha = 1) {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

// ─── Get current color for a hand ─────────────────────────────────────
// Slowly cycles through the palette over time
export function getCurrentColor(handedness, frameCount) {
  const palette = PALETTES[handedness] || PALETTES.Right
  const total   = palette.length
  const pos     = (frameCount * 0.008) % total // speed of color shift
  const idx     = Math.floor(pos) % total
  const next    = (idx + 1) % total
  const t       = pos - Math.floor(pos)
  return lerpColor(palette[idx], palette[next], t)
}

// ─── Draw one aesthetic stroke segment ────────────────────────────────
export function drawStroke(ctx, from, to, color, brushSize) {
  if (!from || !to) return

  // Skip if points are identical (no movement)
  if (from.x === to.x && from.y === to.y) return

  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  // ── Layer 1: Outer glow (widest, most transparent) ──
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 6
  ctx.filter      = `blur(${brushSize * 1.2}px)`
  strokePath(ctx, from, to)

  // ── Layer 2: Mid glow ──
  ctx.globalAlpha = 0.15
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 3
  ctx.filter      = `blur(${brushSize * 0.5}px)`
  strokePath(ctx, from, to)

  // ── Layer 3: Inner glow ──
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 1.5
  ctx.filter      = `blur(${brushSize * 0.15}px)`
  strokePath(ctx, from, to)

  // ── Layer 4: Core white stroke (the bright center) ──
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth   = brushSize * 0.35
  ctx.filter      = 'none'
  strokePath(ctx, from, to)

  // ── Layer 5: Color overlay on core ──
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.6
  ctx.filter      = 'none'
  strokePath(ctx, from, to)

  ctx.restore()
}

// ─── Draw sparkle particles along the stroke ──────────────────────────
export function drawSparkles(ctx, point, color, brushSize) {
  // Number of sparkles scales with brush size
  const count = Math.max(2, Math.floor(brushSize * 0.6))

  ctx.save()
  for (let i = 0; i < count; i++) {
    // Random position around the draw point
    const angle  = Math.random() * Math.PI * 2
    const dist   = Math.random() * brushSize * 2.5
    const x      = point.x + Math.cos(angle) * dist
    const y      = point.y + Math.sin(angle) * dist
    const size   = Math.random() * 1.8 + 0.3
    const alpha  = Math.random() * 0.5 + 0.1

    ctx.globalAlpha = alpha
    ctx.fillStyle   = Math.random() > 0.4
      ? toRgb(color)
      : 'rgba(255,255,255,0.9)'

    ctx.shadowColor = toRgb(color)
    ctx.shadowBlur  = size * 4

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// ─── Draw cursor ring at fingertip ────────────────────────────────────
export function drawCursor(ctx, point, color, isDrawing, brushSize) {
  ctx.save()

  const ringSize = isDrawing ? brushSize * 0.8 : 10

  // Outer ring
  ctx.globalAlpha = isDrawing ? 0.8 : 0.4
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = isDrawing ? 2 : 1.5
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = isDrawing ? 15 : 8
  ctx.beginPath()
  ctx.arc(point.x, point.y, ringSize + 4, 0, Math.PI * 2)
  ctx.stroke()

  // Inner dot
  ctx.globalAlpha = isDrawing ? 1 : 0.6
  ctx.fillStyle   = isDrawing ? 'rgba(255,255,255,0.95)' : toRgb(color)
  ctx.shadowBlur  = isDrawing ? 20 : 10
  ctx.beginPath()
  ctx.arc(point.x, point.y, isDrawing ? 3 : 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ─── Draw eraser indicator ────────────────────────────────────────────
export function drawEraserIndicator(ctx, point, size) {
  ctx.save()
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth   = 1.5
  ctx.shadowColor = '#ef4444'
  ctx.shadowBlur  = 8
  ctx.setLineDash([4, 4])

  ctx.beginPath()
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
  ctx.stroke()

  // X in center
  const s = size * 0.4
  ctx.setLineDash([])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(point.x - s, point.y - s)
  ctx.lineTo(point.x + s, point.y + s)
  ctx.moveTo(point.x + s, point.y - s)
  ctx.lineTo(point.x - s, point.y + s)
  ctx.stroke()

  ctx.restore()
}

// ─── Erase a circular area ────────────────────────────────────────────
export function eraseArea(ctx, point, size) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fill()
  ctx.restore()
}

// ─── Helper: stroke a line between two points ─────────────────────────
function strokePath(ctx, from, to) {
  // Use quadratic bezier through the midpoint for smoother curves
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2

  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(from.x, from.y, mx, my)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}