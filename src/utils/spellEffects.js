// ─── Spell visual effects ────────────────────────────────────────────────────
// Each spell is a particle system / canvas animation

const TAU = Math.PI * 2

// ── Shared particle system ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x    = x;  this.y    = y
    this.vx   = vx; this.vy   = vy
    this.life = life; this.maxLife = life
    this.color = color; this.size = size
  }
  update() {
    this.x    += this.vx
    this.y    += this.vy
    this.vy   += 0.08 // gravity
    this.vx   *= 0.98
    this.life--
  }
  draw(ctx) {
    const alpha = this.life / this.maxLife
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle   = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur  = this.size * 2
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * alpha, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

// ── Run an animation loop that auto-cleans up ─────────────────────────────────
function runAnimation(uiCanvas, frames, drawFrame) {
  let frame = 0
  function loop() {
    if (frame >= frames) return
    const ctx = uiCanvas.getContext('2d')
    drawFrame(ctx, frame, frames)
    frame++
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

// ─── PORTAL spell ────────────────────────────────────────────────────────────
export function castPortal(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(40, radius)
  const frames = 120

  runAnimation(uiCanvas, frames, (ctx, frame) => {
    const progress = frame / frames
    const alpha    = frame < frames * 0.7 ? 1 : 1 - (frame - frames * 0.7) / (frames * 0.3)

    // Spinning outer ring
    ctx.save()
    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth   = 3
    ctx.shadowColor = '#818cf8'
    ctx.shadowBlur  = 20
    ctx.beginPath()
    ctx.arc(x, y, r + 10, frame * 0.08, frame * 0.08 + TAU * 0.75)
    ctx.stroke()
    ctx.restore()

    // Counter-rotating inner ring
    ctx.save()
    ctx.globalAlpha = alpha * 0.7
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth   = 2
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur  = 15
    ctx.beginPath()
    ctx.arc(x, y, r * 0.7, -frame * 0.12, -frame * 0.12 + TAU * 0.6)
    ctx.stroke()
    ctx.restore()

    // Pulsing center energy
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.2)
    const grad  = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5 * pulse)
    grad.addColorStop(0, `rgba(167,139,250,${alpha * 0.6})`)
    grad.addColorStop(0.5, `rgba(129,140,248,${alpha * 0.3})`)
    grad.addColorStop(1, 'rgba(129,140,248,0)')
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle   = grad
    ctx.beginPath()
    ctx.arc(x, y, r * 0.5, 0, TAU)
    ctx.fill()
    ctx.restore()

    // Orbiting energy sparks
    for (let i = 0; i < 6; i++) {
      const angle  = frame * 0.1 + i * (TAU / 6)
      const sx     = x + Math.cos(angle) * r * 0.85
      const sy     = y + Math.sin(angle) * r * 0.85
      ctx.save()
      ctx.globalAlpha = alpha * 0.8
      ctx.fillStyle   = '#ffffff'
      ctx.shadowColor = '#a78bfa'
      ctx.shadowBlur  = 10
      ctx.beginPath()
      ctx.arc(sx, sy, 3, 0, TAU)
      ctx.fill()
      ctx.restore()
    }

    // Permanent portal ring on the drawing canvas
    if (frame === 20) {
      const dctx = drawCanvas.getContext('2d')
      dctx.save()
      for (let ring = 0; ring < 3; ring++) {
        dctx.strokeStyle = ring === 0 ? '#818cf8' : ring === 1 ? '#a78bfa' : '#f472b6'
        dctx.lineWidth   = 3 - ring
        dctx.globalAlpha = 0.6 - ring * 0.15
        dctx.shadowColor = '#818cf8'
        dctx.shadowBlur  = 15
        dctx.beginPath()
        dctx.arc(x, y, r + ring * 6, 0, TAU)
        dctx.stroke()
      }
      dctx.restore()
    }
  })
}

// ─── LIGHTNING spell ─────────────────────────────────────────────────────────
export function castLightning(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(50, radius)
  const bolts  = 8
  const frames = 80

  // Draw permanent lightning mark on canvas
  const dctx = drawCanvas.getContext('2d')
  for (let b = 0; b < bolts; b++) {
    const angle = (b / bolts) * TAU
    const bx    = x + Math.cos(angle) * r
    const by    = y + Math.sin(angle) * r
    const pts   = buildLightningPath(x, y, bx, by, 5)

    dctx.save()
    dctx.strokeStyle = '#fbbf24'
    dctx.lineWidth   = 1.5
    dctx.shadowColor = '#fbbf24'
    dctx.shadowBlur  = 12
    dctx.globalAlpha = 0.6
    dctx.beginPath()
    pts.forEach((p, i) => i === 0 ? dctx.moveTo(p.x, p.y) : dctx.lineTo(p.x, p.y))
    dctx.stroke()

    dctx.strokeStyle = '#ffffff'
    dctx.lineWidth   = 0.5
    dctx.globalAlpha = 0.8
    dctx.beginPath()
    pts.forEach((p, i) => i === 0 ? dctx.moveTo(p.x, p.y) : dctx.lineTo(p.x, p.y))
    dctx.stroke()
    dctx.restore()
  }

  // Animated flash effect on UI layer
  runAnimation(uiCanvas, frames, (ctx, frame) => {
    const progress = frame / frames
    const alpha    = Math.max(0, 1 - progress * 1.5)

    // Central flash
    if (frame < 15) {
      const flashAlpha = (1 - frame / 15) * 0.8
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.4)
      grad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`)
      grad.addColorStop(0.5, `rgba(251,191,36,${flashAlpha * 0.5})`)
      grad.addColorStop(1, 'rgba(251,191,36,0)')
      ctx.save()
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r * 0.4, 0, TAU)
      ctx.fill()
      ctx.restore()
    }

    // Expanding shock ring
    const ringR = r * 0.1 + progress * r * 1.5
    ctx.save()
    ctx.globalAlpha = alpha * 0.6
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth   = 2
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur  = 10
    ctx.beginPath()
    ctx.arc(x, y, ringR, 0, TAU)
    ctx.stroke()
    ctx.restore()
  })
}

function buildLightningPath(x1, y1, x2, y2, segments) {
  const pts = [{ x: x1, y: y1 }]
  for (let i = 1; i < segments; i++) {
    const t  = i / segments
    const jx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30
    const jy = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30
    pts.push({ x: jx, y: jy })
  }
  pts.push({ x: x2, y: y2 })
  return pts
}

// ─── HEART spell ─────────────────────────────────────────────────────────────
export function castHeart(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(40, radius)
  const frames = 100
  const hearts = Array.from({ length: 12 }, (_, i) => ({
    x:    x + (Math.random() - 0.5) * r,
    y:    y + (Math.random() - 0.5) * r * 0.5,
    vy:  -1.5 - Math.random() * 2,
    vx:   (Math.random() - 0.5) * 1.5,
    size: 8 + Math.random() * 16,
    life: frames * (0.5 + Math.random() * 0.5),
    phase: Math.random() * TAU,
  }))

  // Draw heart outline on canvas
  const dctx = drawCanvas.getContext('2d')
  dctx.save()
  dctx.strokeStyle = '#f472b6'
  dctx.lineWidth   = 2
  dctx.shadowColor = '#f472b6'
  dctx.shadowBlur  = 15
  dctx.globalAlpha = 0.7
  drawHeartPath(dctx, x, y, r * 0.6)
  dctx.stroke()
  dctx.restore()

  runAnimation(uiCanvas, frames, (ctx, frame) => {
    hearts.forEach(h => {
      const age   = frame
      const alpha = Math.max(0, 1 - age / h.life)
      const hx    = h.x + h.vx * age
      const hy    = h.y + h.vy * age + 0.03 * age * age
      const wobble = Math.sin(age * 0.15 + h.phase) * 3

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle   = '#f472b6'
      ctx.shadowColor = '#f472b6'
      ctx.shadowBlur  = h.size
      ctx.translate(hx + wobble, hy)
      ctx.scale(h.size / 30, h.size / 30)
      drawHeartPath(ctx, 0, 0, 15)
      ctx.fill()
      ctx.restore()
    })
  })
}

function drawHeartPath(ctx, x, y, size) {
  ctx.beginPath()
  ctx.moveTo(x, y + size * 0.3)
  ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1)
  ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size * 0.9, x, y + size)
  ctx.bezierCurveTo(x, y + size * 0.9, x + size, y + size * 0.6, x + size, y + size * 0.1)
  ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3)
  ctx.closePath()
}

// ─── STAR / STARDUST spell ───────────────────────────────────────────────────
export function castStar(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(50, radius)
  const frames = 90
  const particles = Array.from({ length: 60 }, () => {
    const angle = Math.random() * TAU
    const speed = 2 + Math.random() * 5
    return new Particle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      40 + Math.random() * 40,
      Math.random() > 0.5 ? '#fbbf24' : '#ffffff',
      2 + Math.random() * 4
    )
  })

  // Draw 5-pointed star on canvas
  const dctx = drawCanvas.getContext('2d')
  dctx.save()
  dctx.strokeStyle = '#fbbf24'
  dctx.lineWidth   = 2
  dctx.shadowColor = '#fbbf24'
  dctx.shadowBlur  = 20
  dctx.globalAlpha = 0.8
  dctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const innerAngle = outerAngle + Math.PI / 5
    const ox = x + Math.cos(outerAngle) * r * 0.7
    const oy = y + Math.sin(outerAngle) * r * 0.7
    const ix = x + Math.cos(innerAngle) * r * 0.3
    const iy = y + Math.sin(innerAngle) * r * 0.3
    if (i === 0) dctx.moveTo(ox, oy)
    else dctx.lineTo(ox, oy)
    dctx.lineTo(ix, iy)
  }
  dctx.closePath()
  dctx.stroke()
  dctx.restore()

  runAnimation(uiCanvas, frames, (ctx, frame) => {
    particles.forEach(p => { p.update(); p.draw(ctx) })

    // Central burst flash
    if (frame < 20) {
      const burst = 1 - frame / 20
      const grad  = ctx.createRadialGradient(x, y, 0, x, y, r * burst)
      grad.addColorStop(0, `rgba(255,220,0,${burst * 0.7})`)
      grad.addColorStop(1, 'rgba(255,220,0,0)')
      ctx.save()
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r * burst, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  })
}

// ─── GALAXY spell ────────────────────────────────────────────────────────────
export function castGalaxy(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(60, radius)
  const frames = 150
  const arms   = 3
  const starsPerArm = 25

  runAnimation(uiCanvas, frames, (ctx, frame) => {
    const progress = frame / frames
    const alpha    = frame < frames * 0.7 ? 1 : 1 - (frame - frames * 0.7) / (frames * 0.3)

    ctx.save()
    ctx.globalAlpha = alpha * 0.85

    for (let arm = 0; arm < arms; arm++) {
      for (let s = 0; s < starsPerArm; s++) {
        const t       = s / starsPerArm
        const baseAngle = arm * (TAU / arms) + t * Math.PI * 2.5
        const angle   = baseAngle + frame * 0.025
        const dist_   = t * r
        const sx      = x + Math.cos(angle) * dist_
        const sy      = y + Math.sin(angle) * dist_
        const size    = (1 - t) * 3 + 0.5

        const hue = (arm * 120 + t * 60) % 360
        ctx.fillStyle   = `hsl(${hue}, 80%, 75%)`
        ctx.shadowColor = `hsl(${hue}, 80%, 75%)`
        ctx.shadowBlur  = size * 3
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, TAU)
        ctx.fill()
      }
    }

    // Central bright core
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.2)
    coreGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`)
    coreGrad.addColorStop(0.5, `rgba(200,150,255,${alpha * 0.4})`)
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha
    ctx.fillStyle   = coreGrad
    ctx.beginPath()
    ctx.arc(x, y, r * 0.2, 0, TAU)
    ctx.fill()

    ctx.restore()
  })
}

// ─── WAVE spell ──────────────────────────────────────────────────────────────
export function castWave(uiCanvas, drawCanvas, x, y, radius) {
  const r      = Math.max(80, radius)
  const frames = 100
  const waves  = 4

  runAnimation(uiCanvas, frames, (ctx, frame) => {
    const alpha = Math.max(0, 1 - frame / frames)

    for (let w = 0; w < waves; w++) {
      const progress = ((frame / frames) + w / waves) % 1
      const wRadius  = progress * r * 2
      const wAlpha   = alpha * (1 - progress)

      ctx.save()
      ctx.globalAlpha = wAlpha * 0.7
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth   = 3 * (1 - progress)
      ctx.shadowColor = '#22d3ee'
      ctx.shadowBlur  = 15
      ctx.beginPath()
      ctx.ellipse(x, y, wRadius, wRadius * 0.4, 0, 0, TAU)
      ctx.stroke()
      ctx.restore()
    }

    // Water drops
    if (frame % 8 === 0) {
      const dropX = x + (Math.random() - 0.5) * r
      const dropY = y + (Math.random() - 0.5) * r * 0.4
      const dctx  = drawCanvas.getContext('2d')
      dctx.save()
      dctx.fillStyle   = '#22d3ee'
      dctx.shadowColor = '#22d3ee'
      dctx.shadowBlur  = 8
      dctx.globalAlpha = 0.4
      dctx.beginPath()
      dctx.arc(dropX, dropY, 3, 0, TAU)
      dctx.fill()
      dctx.restore()
    }
  })
}

// ─── Master dispatcher ────────────────────────────────────────────────────────
export function castSpell(spell, uiCanvas, drawCanvas) {
  const { x, y, radius } = spell
  switch (spell.spell) {
    case 'portal':    castPortal(uiCanvas, drawCanvas, x, y, radius);    break
    case 'lightning': castLightning(uiCanvas, drawCanvas, x, y, radius); break
    case 'heart':     castHeart(uiCanvas, drawCanvas, x, y, radius);     break
    case 'star':      castStar(uiCanvas, drawCanvas, x, y, radius);      break
    case 'galaxy':    castGalaxy(uiCanvas, drawCanvas, x, y, radius);    break
    case 'wave':      castWave(uiCanvas, drawCanvas, x, y, radius);      break
  }
}