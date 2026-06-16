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

export function toRgb(c, alpha = 1) {
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
// ─── Draw lightning branch effect (replaces old sparkles) ─────────────
// Occasionally draws small jagged branches off the main stroke
export function drawLightning(ctx, from, to, color, brushSize) {
  if (!from || !to) return

  // Only trigger occasionally — not every single frame
  // This keeps the effect sparse and clean instead of overwhelming
  if (Math.random() > 0.12) return

  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return

  // Direction of the main stroke
  const angle = Math.atan2(dy, dx)

  // Branch starts somewhere along the stroke segment
  const t = Math.random()
  const startX = from.x + dx * t
  const startY = from.y + dy * t

  // Branch shoots off at a perpendicular-ish angle
  const branchAngle  = angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.4)
  const branchLength = brushSize * (1.2 + Math.random() * 1.5)

  // Build a jagged path with 2-3 segments (like a lightning bolt)
  const segments = 2 + Math.floor(Math.random() * 2)
  let cx = startX
  let cy = startY
  const points = [{ x: cx, y: cy }]

  for (let i = 0; i < segments; i++) {
    const segLen   = branchLength / segments
    const jitter   = (Math.random() - 0.5) * 0.6
    const segAngle = branchAngle + jitter
    cx += Math.cos(segAngle) * segLen
    cy += Math.sin(segAngle) * segLen
    points.push({ x: cx, y: cy })
  }

  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  // Outer glow of the bolt
  ctx.globalAlpha = 0.25
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = 2
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = 8
  drawJaggedPath(ctx, points)

  // Bright core of the bolt
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth   = 0.8
  ctx.shadowBlur  = 4
  drawJaggedPath(ctx, points)

  ctx.restore()
}

// Helper — draw a path through multiple points
function drawJaggedPath(ctx, points) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
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