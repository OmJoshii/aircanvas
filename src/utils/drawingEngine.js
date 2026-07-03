// ─── Color utilities ───────────────────────────────────────────────────────
import { drawTreeGuide } from './treeEngine'

export const PALETTES = {
  Left: [
    { r:129,g:140,b:248 },
    { r:167,g:139,b:250 },
    { r:34, g:211,b:238 },
    { r:96, g:165,b:250 },
    { r:192,g:132,b:252 },
  ],
  Right: [
    { r:244,g:114,b:182 },
    { r:251,g:146,b:60  },
    { r:251,g:191,b:36  },
    { r:232,g:121,b:249 },
    { r:248,g:113,b:113 },
  ],
}

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

export function getCurrentColor(handedness, frameCount) {
  const palette = PALETTES[handedness] || PALETTES.Right
  const total   = palette.length
  const pos     = (frameCount * 0.008) % total
  const idx     = Math.floor(pos) % total
  const next    = (idx + 1) % total
  const t       = pos - Math.floor(pos)
  return lerpColor(palette[idx], palette[next], t)
}

// Hex color to {r,g,b}
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return { r, g, b }
}

// ─── Brush definitions ─────────────────────────────────────────────────────

export const BRUSHES = [
  { id: 'neon',      label: 'Neon Glow',   icon: '💜' },
  { id: 'galaxy',    label: 'Galaxy',       icon: '🌌' },
  { id: 'fire',      label: 'Fire',         icon: '🔥' },
  { id: 'crystal',   label: 'Crystal',      icon: '💎' },
  { id: 'lightning', label: 'Lightning',    icon: '⚡' },
  { id: 'plasma',    label: 'Plasma',       icon: '🟣' },
  { id: 'aurora',    label: 'Aurora',       icon: '🌈' },
  { id: 'magic',     label: 'Magic Wand',   icon: '✨' },
  { id: 'hologram',  label: 'Hologram',     icon: '🔷' },
  { id: 'tree',      label: 'Tree Brush',   icon: '🌳' },
]

// ─── Master draw dispatch ──────────────────────────────────────────────────

export function drawStroke(ctx, from, to, color, brushSize, brushId = 'neon', frameCount = 0) {
  if (!from || !to) return
  if (from.x === to.x && from.y === to.y) return

  switch (brushId) {
    case 'neon':      drawNeon(ctx, from, to, color, brushSize);              break
    case 'galaxy':    drawGalaxy(ctx, from, to, color, brushSize, frameCount); break
    case 'fire':      drawFire(ctx, from, to, color, brushSize, frameCount);   break
    case 'crystal':   drawCrystal(ctx, from, to, color, brushSize);           break
    case 'lightning': drawLightningBrush(ctx, from, to, color, brushSize);    break
    case 'plasma':    drawPlasma(ctx, from, to, color, brushSize, frameCount); break
    case 'aurora':    drawAurora(ctx, from, to, color, brushSize, frameCount); break
    case 'magic':     drawMagic(ctx, from, to, color, brushSize, frameCount);  break
    case 'hologram':  drawHologram(ctx, from, to, color, brushSize, frameCount); break
    case 'tree':      drawTreeGuide(ctx, from, to, color, brushSize);          break
    default:          drawNeon(ctx, from, to, color, brushSize);
  }
}

// ─── 1. NEON GLOW ─────────────────────────────────────────────────────────
function drawNeon(ctx, from, to, color, brushSize) {
  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = brushSize * 1.5
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.9
  strokePath(ctx, from, to)

  ctx.shadowBlur  = 0
  ctx.globalAlpha = 0.95
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = brushSize * 0.25
  strokePath(ctx, from, to)

  ctx.globalAlpha = 0.65
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.5
  strokePath(ctx, from, to)

  ctx.restore()
}

// ─── 2. GALAXY ────────────────────────────────────────────────────────────
function drawGalaxy(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()

  // Soft nebula core
  const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
  grad.addColorStop(0, toRgb(color, 0.6))
  grad.addColorStop(0.5, `rgba(200,150,255,0.4)`)
  grad.addColorStop(1, toRgb(color, 0.6))
  ctx.strokeStyle = grad
  ctx.lineWidth   = brushSize * 1.2
  ctx.lineCap     = 'round'
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = brushSize * 2
  strokePath(ctx, from, to)

  // Star field along path
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4)
  for (let i = 0; i < steps; i++) {
    const t  = i / Math.max(steps - 1, 1)
    const mx = from.x + (to.x - from.x) * t
    const my = from.y + (to.y - from.y) * t

    if (Math.random() > 0.55) continue

    const spread = brushSize * 1.8
    const sx = mx + (Math.random() - 0.5) * spread
    const sy = my + (Math.random() - 0.5) * spread
    const sz = Math.random() * 2.2 + 0.3

    // Twinkle effect — vary alpha with frame
    const twinkle = 0.5 + 0.5 * Math.sin(frameCount * 0.1 + i)

    ctx.globalAlpha = Math.random() * 0.8 * twinkle + 0.15
    ctx.fillStyle   = Math.random() > 0.5 ? '#ffffff' : toRgb(color)
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = sz * 3
    ctx.beginPath()
    ctx.arc(sx, sy, sz, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// ─── 3. FIRE ──────────────────────────────────────────────────────────────
function drawFire(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  // Core flame — yellow→orange gradient
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const perp  = angle + Math.PI / 2

  const grad = ctx.createLinearGradient(
    from.x + Math.cos(perp) * brushSize,
    from.y + Math.sin(perp) * brushSize,
    from.x - Math.cos(perp) * brushSize,
    from.y - Math.sin(perp) * brushSize
  )
  grad.addColorStop(0,   'rgba(255,60,0,0)')
  grad.addColorStop(0.3, 'rgba(255,120,0,0.8)')
  grad.addColorStop(0.5, 'rgba(255,220,0,1)')
  grad.addColorStop(0.7, 'rgba(255,120,0,0.8)')
  grad.addColorStop(1,   'rgba(255,60,0,0)')

  ctx.strokeStyle = grad
  ctx.lineWidth   = brushSize * 1.4
  ctx.shadowColor = '#ff6000'
  ctx.shadowBlur  = brushSize * 1.5
  strokePath(ctx, from, to)

  // White hot core
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = '#ffffc0'
  ctx.lineWidth   = brushSize * 0.3
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur  = 6
  strokePath(ctx, from, to)

  // Embers — drift upward slightly
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 5)
  for (let i = 0; i < steps; i++) {
    if (Math.random() > 0.4) continue
    const t  = i / Math.max(steps - 1, 1)
    const mx = from.x + (to.x - from.x) * t
    const my = from.y + (to.y - from.y) * t

    // Drift upward (negative y) based on time
    const drift = (Math.sin(frameCount * 0.05 + i) * 0.5 + 0.5) * brushSize * 2
    const ex    = mx + (Math.random() - 0.5) * brushSize * 1.5
    const ey    = my - drift * Math.random()
    const eSize = Math.random() * 2 + 0.5

    ctx.globalAlpha = Math.random() * 0.7 + 0.1
    ctx.fillStyle   = Math.random() > 0.5 ? '#ff8800' : '#ffdd00'
    ctx.shadowColor = '#ff4400'
    ctx.shadowBlur  = eSize * 4
    ctx.beginPath()
    ctx.arc(ex, ey, eSize, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// ─── 4. CRYSTAL ───────────────────────────────────────────────────────────
function drawCrystal(ctx, from, to, color, brushSize) {
  ctx.save()
  ctx.lineCap  = 'round'

  const dx   = to.x - from.x
  const dy   = to.y - from.y
  const len  = Math.hypot(dx, dy)
  const nx   = -dy / len  // normal vector
  const ny   =  dx / len

  const offset = brushSize * 0.6

  // Draw multiple offset facets in prismatic colors
  const facets = [
    { ox: nx * offset,  oy: ny * offset,  color: `rgba(180,220,255,0.7)` },
    { ox: -nx * offset, oy: -ny * offset, color: `rgba(255,180,255,0.7)` },
    { ox: nx * offset * 0.4, oy: ny * offset * 0.4, color: '#ffffff' },
  ]

  facets.forEach(f => {
    ctx.beginPath()
    ctx.moveTo(from.x + f.ox, from.y + f.oy)
    ctx.lineTo(to.x + f.ox, to.y + f.oy)
    ctx.strokeStyle = f.color
    ctx.lineWidth   = brushSize * 0.35
    ctx.shadowColor = f.color
    ctx.shadowBlur  = 6
    ctx.stroke()
  })

  // Sharp bright core
  ctx.globalAlpha = 0.95
  ctx.strokeStyle = '#e8f4ff'
  ctx.lineWidth   = brushSize * 0.2
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur  = 12
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()

  // Occasional crystal sparkle
  if (Math.random() > 0.7) {
    const mx   = (from.x + to.x) / 2
    const my   = (from.y + to.y) / 2
    drawSparkleShape(ctx, mx, my, brushSize * 0.8)
  }

  ctx.restore()
}

function drawSparkleShape(ctx, x, y, size) {
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = 1.5
  ctx.shadowColor = '#c0e0ff'
  ctx.shadowBlur  = 8
  ;[0, Math.PI/4, Math.PI/2, 3*Math.PI/4].forEach(angle => {
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size)
    ctx.lineTo(x - Math.cos(angle) * size, y - Math.sin(angle) * size)
    ctx.stroke()
  })
  ctx.restore()
}

// ─── 5. LIGHTNING BRUSH ───────────────────────────────────────────────────
function drawLightningBrush(ctx, from, to, color, brushSize) {
  ctx.save()
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  // Always-on jagged main bolt
  const pts  = buildJaggedPath(from, to, brushSize * 0.6, 4)

  ctx.globalAlpha = 0.5
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.8
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = brushSize * 2
  drawPolyline(ctx, pts)

  ctx.globalAlpha = 0.9
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = brushSize * 0.2
  ctx.shadowBlur  = 4
  drawPolyline(ctx, pts)

  // Random branches
  if (Math.random() > 0.5) {
    const branchFrom = pts[Math.floor(pts.length * 0.3 + Math.random() * pts.length * 0.4)]
    if (branchFrom) {
      const angle  = Math.atan2(to.y - from.y, to.x - from.x) + (Math.random() - 0.5) * 1.2
      const bLen   = brushSize * (1.5 + Math.random() * 2)
      const bTo    = { x: branchFrom.x + Math.cos(angle) * bLen, y: branchFrom.y + Math.sin(angle) * bLen }
      const bPts   = buildJaggedPath(branchFrom, bTo, brushSize * 0.3, 2)

      ctx.globalAlpha = 0.45
      ctx.strokeStyle = toRgb(color)
      ctx.lineWidth   = brushSize * 0.35
      ctx.shadowBlur  = brushSize
      drawPolyline(ctx, bPts)
    }
  }

  ctx.restore()
}

function buildJaggedPath(from, to, jitter, segments) {
  const pts = [from]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    pts.push({
      x: from.x + (to.x - from.x) * t + (Math.random() - 0.5) * jitter * 2,
      y: from.y + (to.y - from.y) * t + (Math.random() - 0.5) * jitter * 2,
    })
  }
  pts.push(to)
  return pts
}

function drawPolyline(ctx, pts) {
  if (pts.length < 2) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.stroke()
}

// ─── 6. PLASMA ────────────────────────────────────────────────────────────
function drawPlasma(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()
  ctx.lineCap  = 'round'

  const steps  = 8
  const dx     = to.x - from.x
  const dy     = to.y - from.y
  const len    = Math.hypot(dx, dy) || 1
  const nx     = -dy / len
  const ny     =  dx / len
  const freq   = 0.12
  const amp    = brushSize * 0.9

  // Plasma wave — sine offset perpendicular to stroke
  const wavePts = []
  for (let i = 0; i <= steps; i++) {
    const t    = i / steps
    const wave = Math.sin(t * Math.PI * 3 + frameCount * 0.15) * amp
    wavePts.push({
      x: from.x + dx * t + nx * wave,
      y: from.y + dy * t + ny * wave,
    })
  }

  // Outer plasma glow
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = `rgba(0,255,200,0.8)`
  ctx.lineWidth   = brushSize * 1.4
  ctx.shadowColor = `#00ffcc`
  ctx.shadowBlur  = brushSize * 2.5
  drawPolyline(ctx, wavePts)

  // Inner bright wave
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = brushSize * 0.25
  ctx.shadowColor = '#00ffcc'
  ctx.shadowBlur  = 8
  drawPolyline(ctx, wavePts)

  // Color overlay
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.6
  ctx.shadowBlur  = 0
  drawPolyline(ctx, wavePts)

  ctx.restore()
}

// ─── 7. AURORA ────────────────────────────────────────────────────────────
function drawAurora(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()
  ctx.lineCap  = 'round'

  const dx  = to.x - from.x
  const dy  = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const nx  = -dy / len
  const ny  =  dx / len

  // Draw multiple wide soft bands offset from each other
  const bands = [
    { offset: 0,             color: `rgba(0,255,150,0.25)`,  width: brushSize * 3.5 },
    { offset: brushSize * 1, color: `rgba(100,100,255,0.2)`, width: brushSize * 2.5 },
    { offset:-brushSize * 1, color: `rgba(200,0,255,0.2)`,   width: brushSize * 2   },
    { offset: brushSize * 2, color: `rgba(0,200,255,0.15)`,  width: brushSize * 1.5 },
  ]

  bands.forEach((band, bi) => {
    const wave = Math.sin(frameCount * 0.04 + bi * 1.2) * brushSize * 0.8
    const bfx  = from.x + nx * (band.offset + wave)
    const bfy  = from.y + ny * (band.offset + wave)
    const btx  = to.x   + nx * (band.offset + wave)
    const bty  = to.y   + ny * (band.offset + wave)

    ctx.globalAlpha = 0.9
    ctx.strokeStyle = band.color
    ctx.lineWidth   = band.width
    ctx.shadowColor = band.color
    ctx.shadowBlur  = band.width * 0.8
    ctx.filter      = `blur(${brushSize * 0.15}px)`
    ctx.beginPath()
    ctx.moveTo(bfx, bfy)
    ctx.lineTo(btx, bty)
    ctx.stroke()
    ctx.filter = 'none'
  })

  // Bright shimmer core
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = 'rgba(220,255,220,0.9)'
  ctx.lineWidth   = brushSize * 0.2
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur  = 6
  strokePath(ctx, from, to)

  ctx.restore()
}

// ─── 8. MAGIC WAND ────────────────────────────────────────────────────────
function drawMagic(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()

  // Thin sparkling trail
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = brushSize * 0.3
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = 8
  ctx.lineCap     = 'round'
  strokePath(ctx, from, to)

  // Dense sparkle stars
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 3)
  for (let i = 0; i < steps; i++) {
    if (Math.random() > 0.5) continue
    const t    = i / Math.max(steps - 1, 1)
    const mx   = from.x + (to.x - from.x) * t
    const my   = from.y + (to.y - from.y) * t
    const sx   = mx + (Math.random() - 0.5) * brushSize * 3
    const sy   = my + (Math.random() - 0.5) * brushSize * 3
    const sz   = Math.random() * 3 + 0.5
    const spin = frameCount * 0.08 + i

    // Four-pointed star
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(spin)
    ctx.globalAlpha = Math.random() * 0.8 + 0.15
    ctx.strokeStyle = Math.random() > 0.4 ? '#ffffff' : toRgb(color)
    ctx.lineWidth   = sz * 0.5
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = sz * 5
    ;[0, Math.PI/4].forEach(rot => {
      ctx.save()
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.moveTo(0, -sz * 2.5)
      ctx.lineTo(0,  sz * 2.5)
      ctx.stroke()
      ctx.restore()
    })
    ctx.restore()
  }

  ctx.restore()
}

// ─── 9. HOLOGRAM ──────────────────────────────────────────────────────────
function drawHologram(ctx, from, to, color, brushSize, frameCount) {
  ctx.save()
  ctx.lineCap  = 'round'

  // Base cyan stroke
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth   = brushSize * 0.7
  ctx.shadowColor = '#00e5ff'
  ctx.shadowBlur  = brushSize * 1.5
  strokePath(ctx, from, to)

  // Scanline flicker effect — offset parallel lines
  const lineCount = 3
  for (let i = 0; i < lineCount; i++) {
    const offsetY = (i - 1) * (brushSize * 0.5)
    const flicker = Math.sin(frameCount * 0.2 + i * 2.1) * 0.4 + 0.3
    ctx.globalAlpha = flicker * 0.5
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth   = brushSize * 0.18
    ctx.shadowBlur  = 4
    ctx.beginPath()
    ctx.moveTo(from.x, from.y + offsetY)
    ctx.lineTo(to.x,   to.y   + offsetY)
    ctx.stroke()
  }

  // Glitch offset — occasional displaced copy
  if (Math.random() > 0.75) {
    const glitchX = (Math.random() - 0.5) * brushSize * 1.5
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#ff00ff'
    ctx.lineWidth   = brushSize * 0.4
    ctx.shadowColor = '#ff00ff'
    ctx.shadowBlur  = 4
    ctx.beginPath()
    ctx.moveTo(from.x + glitchX, from.y)
    ctx.lineTo(to.x   + glitchX, to.y)
    ctx.stroke()
  }

  // White core
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth   = brushSize * 0.15
  ctx.shadowColor = '#00e5ff'
  ctx.shadowBlur  = 6
  strokePath(ctx, from, to)

  ctx.restore()
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function strokePath(ctx, from, to) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(from.x, from.y, mx, my)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

// Lightning effect called from DrawingCanvas (kept for compatibility)
export function drawLightning(ctx, from, to, color, brushSize) {
  if (!from || !to) return
  if (Math.random() > 0.06) return

  const dx  = to.x - from.x
  const dy  = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return

  const angle       = Math.atan2(dy, dx)
  const t           = Math.random()
  const startX      = from.x + dx * t
  const startY      = from.y + dy * t
  const branchAngle = angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.4)
  const branchLen   = brushSize * (1.2 + Math.random() * 1.5)
  const segments    = 2 + Math.floor(Math.random() * 2)

  let cx = startX, cy = startY
  const pts = [{ x: cx, y: cy }]
  for (let i = 0; i < segments; i++) {
    const segLen   = branchLen / segments
    const jitter   = (Math.random() - 0.5) * 0.6
    const segAngle = branchAngle + jitter
    cx += Math.cos(segAngle) * segLen
    cy += Math.sin(segAngle) * segLen
    pts.push({ x: cx, y: cy })
  }

  ctx.save()
  ctx.lineCap     = 'round'
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth   = 0.8
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = 4
  drawPolyline(ctx, pts)
  ctx.restore()
}

// Cursor indicator
export function drawCursor(ctx, point, color, isDrawing, brushSize) {
  ctx.save()
  ctx.shadowColor = toRgb(color)
  ctx.shadowBlur  = isDrawing ? 8 : 4

  ctx.globalAlpha = isDrawing ? 0.8 : 0.4
  ctx.strokeStyle = toRgb(color)
  ctx.lineWidth   = isDrawing ? 2 : 1.5
  ctx.beginPath()
  ctx.arc(point.x, point.y, (isDrawing ? brushSize * 0.8 : 10) + 4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = isDrawing ? 1 : 0.6
  ctx.fillStyle   = isDrawing ? 'rgba(255,255,255,0.95)' : toRgb(color)
  ctx.beginPath()
  ctx.arc(point.x, point.y, isDrawing ? 3 : 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Eraser indicator
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
  ctx.setLineDash([])
  const s = size * 0.4
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(point.x - s, point.y - s); ctx.lineTo(point.x + s, point.y + s)
  ctx.moveTo(point.x + s, point.y - s); ctx.lineTo(point.x - s, point.y + s)
  ctx.stroke()
  ctx.restore()
}

// Erase
export function eraseArea(ctx, point, size) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fill()
  ctx.restore()
}