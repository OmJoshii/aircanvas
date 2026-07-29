// ─── Physics engine for Air Canvas ──────────────────────────────────────────

const GRAVITY      = 0.4
const GROUND_FRIC  = 0.88   // horizontal damping when on ground
const AIR_RESIST   = 0.995  // horizontal damping in air
const MIN_VELOCITY = 0.15   // below this, object is considered at rest

// ── Shape classifier ─────────────────────────────────────────────────────────
export function classifyShape(strokePoints) {
  if (!strokePoints || strokePoints.length < 3) return 'pebble'

  const xs = strokePoints.map(p => p.x)
  const ys = strokePoints.map(p => p.y)
  const w  = Math.max(...xs) - Math.min(...xs)
  const h  = Math.max(...ys) - Math.min(...ys)
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2

  const diag   = Math.hypot(w, h)
  const aspect = w / Math.max(h, 1)
  const area   = w * h

  // Measure circularity — how close are all points to the centroid
  const radii  = strokePoints.map(p => Math.hypot(p.x - cx, p.y - cy))
  const avgR   = radii.reduce((s, r) => s + r, 0) / radii.length
  const rVar   = avgR > 0
    ? Math.sqrt(radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length) / avgR
    : 1

  // Measure if closed
  const startEnd = Math.hypot(
    strokePoints[0].x - strokePoints[strokePoints.length - 1].x,
    strokePoints[0].y - strokePoints[strokePoints.length - 1].y
  )
  const closed = startEnd < diag * 0.3

  // Very large circular stroke → bubble (floats up)
  if (closed && rVar < 0.35 && area > 40000) return 'bubble'

  // Large horizontal stroke → cloud
  if (!closed && aspect > 3 && h < 80) return 'cloud'

  // Circular closed stroke → ball
  if (closed && rVar < 0.35 && aspect > 0.5 && aspect < 2) return 'ball'

  // Tall thin stroke → stick
  if (aspect < 0.4 && h > 80) return 'stick'

  // Wide flat stroke → box/platform
  if (aspect > 2.5) return 'box'

  // Small tight cluster → pebble
  if (area < 3000) return 'pebble'

  // Default → box
  return 'box'
}

// ── Physics object ────────────────────────────────────────────────────────────
export class PhysicsObject {
  constructor(strokePoints, imageData, W, H) {
    const xs  = strokePoints.map(p => p.x)
    const ys  = strokePoints.map(p => p.y)

    this.x    = (Math.max(...xs) + Math.min(...xs)) / 2
    this.y    = (Math.max(...ys) + Math.min(...ys)) / 2
    this.w    = Math.max(...xs) - Math.min(...xs)
    this.h    = Math.max(...ys) - Math.min(...ys)
    this.vx   = (Math.random() - 0.5) * 1.5  // slight random horizontal push
    this.vy   = 0
    this.rot  = 0
    this.rotV = 0
    this.W    = W
    this.H    = H

    // Store the actual pixel data of the drawn stroke for redrawing
    this.imageData   = imageData
    this.imgX        = Math.max(0, Math.min(...xs))
    this.imgY        = Math.max(0, Math.min(...ys))
    this.imgW        = this.w
    this.imgH        = this.h

    this.type        = classifyShape(strokePoints)
    this.alpha       = 1
    this.alive       = true
    this.onGround    = false
    this.age         = 0
    this.color       = this._colorForType()

    // Apply type-specific physics properties
    this._applyTypeProperties()
  }

  _colorForType() {
    switch (this.type) {
      case 'ball':   return '#818cf8'
      case 'box':    return '#fbbf24'
      case 'bubble': return '#22d3ee'
      case 'cloud':  return '#ffffff'
      case 'stick':  return '#34d399'
      case 'pebble': return '#f472b6'
      default:       return '#a78bfa'
    }
  }

  _applyTypeProperties() {
    switch (this.type) {
      case 'ball':
        this.bounce   = 0.65
        this.friction = GROUND_FRIC
        this.gravity  = GRAVITY
        this.rotV     = (Math.random() - 0.5) * 0.08
        break
      case 'box':
        this.bounce   = 0.15
        this.friction = 0.82
        this.gravity  = GRAVITY * 1.2
        this.rotV     = 0
        break
      case 'bubble':
        this.bounce   = 0
        this.friction = 0.99
        this.gravity  = -GRAVITY * 0.18  // floats up
        this.vx       = (Math.random() - 0.5) * 1.2
        this.vy       = -1
        break
      case 'cloud':
        this.bounce   = 0
        this.friction = 0.99
        this.gravity  = -GRAVITY * 0.05  // barely floats
        this.vx       = 0.6 + Math.random() * 0.4  // drifts right
        break
      case 'stick':
        this.bounce   = 0.2
        this.friction = 0.85
        this.gravity  = GRAVITY
        this.rotV     = (Math.random() - 0.5) * 0.12  // tumbles
        break
      case 'pebble':
        this.bounce   = 0.45
        this.friction = 0.80
        this.gravity  = GRAVITY * 1.5   // heavier, falls fast
        this.rotV     = (Math.random() - 0.5) * 0.2
        break
    }
  }

  update() {
    this.age++

    // Bubbles and clouds fade out over time
    if (this.type === 'bubble') {
      this.alpha = Math.max(0, 1 - this.age / 300)
      if (this.alpha <= 0) { this.alive = false; return }
    }
    if (this.type === 'cloud') {
      this.alpha = Math.max(0, 1 - this.age / 500)
      if (this.alpha <= 0) { this.alive = false; return }
    }

    // Apply gravity
    this.vy += this.gravity

    // Apply air resistance
    this.vx *= AIR_RESIST

    // Move
    this.x += this.vx
    this.y += this.vy

    // Rotate
    this.rot += this.rotV

    // Ground collision
    const ground = this.H - 20
    if (this.y + this.h / 2 >= ground) {
      this.y      = ground - this.h / 2
      this.vy    *= -this.bounce
      this.vx    *= this.friction
      this.rotV  *= 0.85  // spin slows on ground

      // Stop tiny bounces
      if (Math.abs(this.vy) < MIN_VELOCITY) {
        this.vy      = 0
        this.onGround = true
      }
    }

    // Wall collisions
    if (this.x - this.w / 2 < 0) {
      this.x  = this.w / 2
      this.vx = Math.abs(this.vx) * 0.5
    }
    if (this.x + this.w / 2 > this.W) {
      this.x  = this.W - this.w / 2
      this.vx = -Math.abs(this.vx) * 0.5
    }

    // Clouds and bubbles: wrap around horizontally when off screen
    if (this.type === 'cloud' && this.x - this.w / 2 > this.W) {
      this.x = -this.w / 2
    }
    if (this.type === 'bubble' && this.y + this.h / 2 < 0) {
      this.alive = false
    }
  }

  // Draw using the actual captured stroke pixels
  draw(ctx) {
    if (!this.alive) return
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rot)

    if (this.imageData) {
      // Draw the actual captured drawing
      ctx.drawImage(
        this.imageData,
        -this.imgW / 2, -this.imgH / 2,
        this.imgW, this.imgH
      )
    } else {
      // Fallback: draw a simple shape
      ctx.fillStyle   = this.color + '40'
      ctx.strokeStyle = this.color
      ctx.lineWidth   = 2
      ctx.shadowColor = this.color
      ctx.shadowBlur  = 10
      ctx.beginPath()
      if (this.type === 'ball' || this.type === 'pebble' || this.type === 'bubble') {
        ctx.arc(0, 0, Math.max(this.w, this.h) / 2, 0, Math.PI * 2)
      } else {
        ctx.rect(-this.w / 2, -this.h / 2, this.w, this.h)
      }
      ctx.fill()
      ctx.stroke()
    }

    // Type label badge
    const emoji = {
      ball: '⚽', box: '📦', bubble: '🫧',
      cloud: '☁️', stick: '🪵', pebble: '🪨'
    }[this.type] || '📦'

    ctx.font        = '16px serif'
    ctx.textAlign   = 'center'
    ctx.shadowBlur  = 0
    ctx.globalAlpha = this.alpha * 0.7
    ctx.fillText(emoji, 0, -this.h / 2 - 8)

    ctx.restore()
  }
}

// ── Physics world ─────────────────────────────────────────────────────────────
export class PhysicsWorld {
  constructor() {
    this.objects = []
  }

  addObject(obj) {
    this.objects.push(obj)
    // Limit total objects to avoid performance issues
    if (this.objects.length > 20) {
      this.objects.shift()
    }
  }

  update() {
    this.objects.forEach(obj => obj.update())
    this.objects = this.objects.filter(obj => obj.alive)

    // Simple object-object collision (bounding box)
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        this._collide(this.objects[i], this.objects[j])
      }
    }
  }

  _collide(a, b) {
    // Skip clouds and bubbles — they pass through everything
    if (a.type === 'cloud' || b.type === 'cloud') return
    if (a.type === 'bubble' || b.type === 'bubble') return

    const dx = b.x - a.x
    const dy = b.y - a.y
    const overlapX = (a.w + b.w) / 2 - Math.abs(dx)
    const overlapY = (a.h + b.h) / 2 - Math.abs(dy)

    if (overlapX > 0 && overlapY > 0) {
      // Push objects apart on the axis of least overlap
      if (overlapX < overlapY) {
        const sign = dx > 0 ? 1 : -1
        a.x -= sign * overlapX * 0.5
        b.x += sign * overlapX * 0.5
        const avgVx = (a.vx + b.vx) / 2
        a.vx = avgVx * -0.4
        b.vx = avgVx *  0.4
      } else {
        const sign = dy > 0 ? 1 : -1
        a.y -= sign * overlapY * 0.5
        b.y += sign * overlapY * 0.5
        const avgVy = (a.vy + b.vy) / 2
        a.vy = avgVy * -0.3
        b.vy = avgVy *  0.3
      }
    }
  }

  draw(ctx) {
    this.objects.forEach(obj => obj.draw(ctx))
  }

  clear() {
    this.objects = []
  }
}