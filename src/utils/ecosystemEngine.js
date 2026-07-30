// ─── Living Ecosystem Simulation Engine ─────────────────────────────────────

const TAU = Math.PI * 2

// ── Seeded random ────────────────────────────────────────────────────────────
function rand(min = 0, max = 1) { return min + Math.random() * (max - min) }

// ── Base entity class ─────────────────────────────────────────────────────────
class Entity {
  constructor(x, y) {
    this.x = x; this.y = y
    this.alive = true
    this.age   = 0
  }
  update(world) { this.age++ }
  draw(ctx, W, H) {}
}

// ── Rain drop ─────────────────────────────────────────────────────────────────
class RainDrop extends Entity {
  constructor(x, y) {
    super(x, y)
    this.vy    = 4 + rand(0, 3)
    this.vx    = rand(-0.5, 0.5)
    this.len   = 8 + rand(0, 6)
    this.alpha = 0.5 + rand(0, 0.4)
  }
  update(world) {
    super.update(world)
    this.x += this.vx
    this.y += this.vy
    if (this.y > world.groundY) {
      // Splash: add water to soil at this x position
      world.addSoilWater(this.x, 3)
      world.addSplash(this.x, world.groundY)
      this.alive = false
    }
  }
  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth   = 1.2
    ctx.shadowColor = '#93c5fd'
    ctx.shadowBlur  = 3
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x + this.vx * 2, this.y + this.len)
    ctx.stroke()
    ctx.restore()
  }
}

// ── Splash particle ───────────────────────────────────────────────────────────
class Splash extends Entity {
  constructor(x, y) {
    super(x, y)
    this.particles = Array.from({ length: 4 }, () => ({
      vx: rand(-2, 2), vy: rand(-3, -1),
      life: rand(10, 20)
    }))
  }
  update(world) {
    super.update(world)
    this.particles.forEach(p => {
      p.x  = (p.x || this.x) + p.vx
      p.y  = (p.y || this.y) + p.vy
      p.vy += 0.2
      p.life--
    })
    this.particles = this.particles.filter(p => p.life > 0)
    if (this.particles.length === 0) this.alive = false
  }
  draw(ctx) {
    ctx.save()
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / 20 * 0.6
      ctx.fillStyle   = '#93c5fd'
      ctx.shadowColor = '#60a5fa'
      ctx.shadowBlur  = 3
      ctx.beginPath()
      ctx.arc(p.x || this.x, p.y || this.y, 1.5, 0, TAU)
      ctx.fill()
    })
    ctx.restore()
  }
}

// ── Cloud ─────────────────────────────────────────────────────────────────────
class Cloud extends Entity {
  constructor(x, y, W) {
    super(x, y)
    this.W          = W
    this.w          = 80 + rand(0, 120)
    this.h          = 30 + rand(0, 25)
    this.vx         = 0.4 + rand(0, 0.4)
    this.rainTimer  = 0
    this.rainRate   = 8 + Math.floor(rand(0, 8))  // frames between drops
    this.isRaining  = true
    this.alpha      = 0.85
  }
  update(world) {
    super.update(world)
    this.x += this.vx
    if (this.x - this.w / 2 > this.W + 50) this.x = -this.w / 2

    // Emit rain drops
    if (this.isRaining) {
      this.rainTimer++
      if (this.rainTimer >= this.rainRate) {
        this.rainTimer = 0
        const rx = this.x + rand(-this.w / 2, this.w / 2)
        world.addEntity(new RainDrop(rx, this.y + this.h / 2))
      }
    }
  }
  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha

    // Draw fluffy cloud shape
    const cx = this.x, cy = this.y
    ctx.fillStyle   = 'rgba(200,220,255,0.7)'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = 15
    ctx.beginPath()
    ctx.arc(cx, cy, this.h * 0.7, 0, TAU)
    ctx.arc(cx - this.w * 0.25, cy + this.h * 0.1, this.h * 0.55, 0, TAU)
    ctx.arc(cx + this.w * 0.25, cy + this.h * 0.15, this.h * 0.5, 0, TAU)
    ctx.arc(cx - this.w * 0.42, cy + this.h * 0.3, this.h * 0.38, 0, TAU)
    ctx.arc(cx + this.w * 0.42, cy + this.h * 0.3, this.h * 0.35, 0, TAU)
    ctx.fill()

    ctx.restore()
  }
}

// ── Sun ───────────────────────────────────────────────────────────────────────
class Sun extends Entity {
  constructor(x, y) {
    super(x, y)
    this.r     = 35 + rand(0, 15)
    this.rays  = 10
    this.angle = 0
  }
  update(world) {
    super.update(world)
    this.angle += 0.005
    world.sunActive = true
  }
  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)

    // Glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 2.5)
    grad.addColorStop(0, 'rgba(255,220,0,0.4)')
    grad.addColorStop(1, 'rgba(255,220,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, this.r * 2.5, 0, TAU)
    ctx.fill()

    // Rays
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth   = 2.5
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur  = 8
    for (let i = 0; i < this.rays; i++) {
      const a    = this.angle + (i / this.rays) * TAU
      const in_  = this.r + 6
      const out_ = this.r + 18 + Math.sin(this.age * 0.05 + i) * 4
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * in_,  Math.sin(a) * in_)
      ctx.lineTo(Math.cos(a) * out_, Math.sin(a) * out_)
      ctx.stroke()
    }

    // Core
    ctx.fillStyle   = '#fde68a'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = 20
    ctx.beginPath()
    ctx.arc(0, 0, this.r, 0, TAU)
    ctx.fill()

    ctx.restore()
  }
}

// ── Grass blade ───────────────────────────────────────────────────────────────
class Grass extends Entity {
  constructor(x, groundY) {
    super(x, groundY)
    this.maxH   = 15 + rand(0, 25)
    this.currentH = 2
    this.growRate = 0.15 + rand(0, 0.1)
    this.sway   = rand(0, TAU)
    this.swaySpeed = 0.04 + rand(0, 0.02)
    this.lean   = rand(-0.3, 0.3)
    this.color  = `hsl(${120 + rand(-15, 15)}, ${60 + rand(0, 20)}%, ${30 + rand(0, 20)}%)`
  }
  update(world) {
    super.update(world)
    if (this.currentH < this.maxH) {
      const growMult = world.sunActive ? 1.5 : 1
      this.currentH = Math.min(this.maxH, this.currentH + this.growRate * growMult)
    }
    this.sway += this.swaySpeed
  }
  draw(ctx) {
    const sway    = Math.sin(this.sway) * 3 + this.lean * this.currentH * 0.3
    const tipX    = this.x + sway
    const tipY    = this.y - this.currentH

    ctx.save()
    ctx.strokeStyle = this.color
    ctx.lineWidth   = 1.5
    ctx.lineCap     = 'round'
    ctx.shadowColor = this.color
    ctx.shadowBlur  = 2
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.quadraticCurveTo(this.x + sway * 0.5, this.y - this.currentH * 0.6, tipX, tipY)
    ctx.stroke()
    ctx.restore()
  }
}

// ── Tree ──────────────────────────────────────────────────────────────────────
class Tree extends Entity {
  constructor(x, groundY) {
    super(x, groundY)
    this.trunkH    = 0
    this.maxTrunkH = 40 + rand(0, 40)
    this.crownR    = 0
    this.maxCrownR = 25 + rand(0, 20)
    this.growRate  = 0.12
    this.sway      = rand(0, TAU)
    this.swaySpeed = 0.02 + rand(0, 0.01)
    this.leafColor = `hsl(${110 + rand(-20, 20)}, ${50 + rand(0, 30)}%, ${25 + rand(0, 20)}%)`
    this.trunkColor = '#5c3d1e'
  }
  update(world) {
    super.update(world)
    const growMult = world.sunActive ? 1.4 : 1
    if (this.trunkH < this.maxTrunkH) {
      this.trunkH = Math.min(this.maxTrunkH, this.trunkH + this.growRate * growMult)
    } else if (this.crownR < this.maxCrownR) {
      this.crownR = Math.min(this.maxCrownR, this.crownR + this.growRate * 0.8 * growMult)
    }
    this.sway += this.swaySpeed
  }
  draw(ctx) {
    if (this.trunkH < 2) return
    const sway = Math.sin(this.sway) * 1.5

    ctx.save()

    // Trunk
    ctx.strokeStyle = this.trunkColor
    ctx.lineWidth   = Math.max(2, this.trunkH * 0.08)
    ctx.lineCap     = 'round'
    ctx.shadowColor = '#3d2a0f'
    ctx.shadowBlur  = 3
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.quadraticCurveTo(
      this.x + sway * 0.3, this.y - this.trunkH * 0.6,
      this.x + sway, this.y - this.trunkH
    )
    ctx.stroke()

    // Crown
    if (this.crownR > 2) {
      const cx = this.x + sway
      const cy = this.y - this.trunkH

      // Outer glow
      ctx.shadowColor = this.leafColor
      ctx.shadowBlur  = 8
      ctx.fillStyle   = this.leafColor
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(cx, cy, this.crownR, 0, TAU)
      ctx.fill()

      // Lighter highlight on top
      ctx.fillStyle   = `hsl(${110}, 60%, 45%)`
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(cx - this.crownR * 0.2, cy - this.crownR * 0.25, this.crownR * 0.6, 0, TAU)
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Fish ──────────────────────────────────────────────────────────────────────
class Fish extends Entity {
  constructor(x, y, riverY) {
    super(x, y)
    this.riverY  = riverY
    this.vx      = (Math.random() > 0.5 ? 1 : -1) * (1.5 + rand(0, 1.5))
    this.vy      = 0
    this.sway    = rand(0, TAU)
    this.swayAmp = 0.8 + rand(0, 0.5)
    this.swaySpd = 0.08 + rand(0, 0.05)
    this.size    = 8 + rand(0, 6)
    this.color   = ['#f472b6', '#818cf8', '#fbbf24', '#34d399'][Math.floor(rand(0, 4))]
    this.jumpTimer = Math.floor(rand(0, 300))
    this.jumping   = false
  }
  update(world) {
    super.update(world)
    this.sway += this.swaySpd
    this.jumpTimer--

    if (this.jumpTimer <= 0 && !this.jumping) {
      this.jumping = true
      this.vy      = -5 - rand(0, 3)
      this.jumpTimer = Math.floor(rand(150, 400))
    }

    if (this.jumping) {
      this.vy += 0.3
      this.y  += this.vy
      if (this.y >= this.riverY - 5) {
        this.y       = this.riverY - 5
        this.jumping = false
        this.vy      = 0
      }
    } else {
      this.y = this.riverY - 5 + Math.sin(this.sway) * this.swayAmp
    }

    this.x += this.vx

    // Bounce off edges
    if (this.x < 20 || this.x > world.W - 20) {
      this.vx *= -1
    }
  }
  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    if (this.vx < 0) ctx.scale(-1, 1)

    ctx.fillStyle   = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur  = 6

    // Body
    ctx.beginPath()
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, TAU)
    ctx.fill()

    // Tail
    ctx.beginPath()
    ctx.moveTo(-this.size, 0)
    ctx.lineTo(-this.size - this.size * 0.7, -this.size * 0.5)
    ctx.lineTo(-this.size - this.size * 0.7,  this.size * 0.5)
    ctx.closePath()
    ctx.fill()

    // Eye
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(this.size * 0.4, -this.size * 0.1, this.size * 0.12, 0, TAU)
    ctx.fill()

    ctx.restore()
  }
}

// ── River ─────────────────────────────────────────────────────────────────────
class River extends Entity {
  constructor(y, W) {
    super(0, y)
    this.W         = W
    this.h         = 18
    this.flowOffset = 0
    this.fishTimer  = 60
    this.fishCount  = 0
    this.maxFish    = 5
  }
  update(world) {
    super.update(world)
    this.flowOffset = (this.flowOffset + 1.5) % 40

    // Spawn fish
    this.fishTimer--
    if (this.fishTimer <= 0 && this.fishCount < this.maxFish) {
      this.fishTimer = 80 + Math.floor(rand(0, 120))
      world.addEntity(new Fish(rand(50, this.W - 50), this.y - 5, this.y))
      this.fishCount++
    }
  }
  draw(ctx) {
    // River body
    const grad = ctx.createLinearGradient(0, this.y - this.h / 2, 0, this.y + this.h / 2)
    grad.addColorStop(0, 'rgba(37,99,235,0.5)')
    grad.addColorStop(0.5, 'rgba(59,130,246,0.7)')
    grad.addColorStop(1, 'rgba(37,99,235,0.4)')

    ctx.save()
    ctx.fillStyle   = grad
    ctx.shadowColor = '#3b82f6'
    ctx.shadowBlur  = 10
    ctx.fillRect(0, this.y - this.h / 2, this.W, this.h)

    // Flowing ripple lines
    ctx.strokeStyle = 'rgba(147,197,253,0.5)'
    ctx.lineWidth   = 1
    ctx.shadowBlur  = 0
    for (let i = 0; i < 4; i++) {
      const ry     = this.y - this.h * 0.3 + i * (this.h * 0.2)
      const offset = (this.flowOffset + i * 10) % 40
      ctx.beginPath()
      for (let x = -40 + offset; x < this.W + 40; x += 40) {
        ctx.moveTo(x,      ry)
        ctx.lineTo(x + 15, ry + 3)
        ctx.lineTo(x + 25, ry - 3)
        ctx.lineTo(x + 40, ry)
      }
      ctx.stroke()
    }
    ctx.restore()
  }
}

// ── Flower ────────────────────────────────────────────────────────────────────
class Flower extends Entity {
  constructor(x, groundY) {
    super(x, groundY)
    this.stemH   = 0
    this.maxStemH = 12 + rand(0, 10)
    this.bloomR  = 0
    this.maxBloom = 5 + rand(0, 5)
    this.growRate = 0.08
    this.color   = ['#f472b6', '#fbbf24', '#a78bfa', '#f97316'][Math.floor(rand(0, 4))]
    this.sway    = rand(0, TAU)
    this.petalCount = 5 + Math.floor(rand(0, 3))
  }
  update(world) {
    super.update(world)
    const growMult = world.sunActive ? 1.5 : 1
    if (this.stemH < this.maxStemH) {
      this.stemH = Math.min(this.maxStemH, this.stemH + this.growRate * growMult)
    } else {
      this.bloomR = Math.min(this.maxBloom, this.bloomR + this.growRate * 0.6 * growMult)
    }
    this.sway += 0.03
  }
  draw(ctx) {
    if (this.stemH < 2) return
    const sway = Math.sin(this.sway) * 1.5
    ctx.save()

    // Stem
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth   = 1.5
    ctx.lineCap     = 'round'
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x + sway, this.y - this.stemH)
    ctx.stroke()

    // Bloom
    if (this.bloomR > 1) {
      const fx = this.x + sway
      const fy = this.y - this.stemH
      for (let i = 0; i < this.petalCount; i++) {
        const a = (i / this.petalCount) * TAU
        ctx.fillStyle   = this.color
        ctx.shadowColor = this.color
        ctx.shadowBlur  = 4
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.ellipse(
          fx + Math.cos(a) * this.bloomR * 0.9,
          fy + Math.sin(a) * this.bloomR * 0.9,
          this.bloomR * 0.65, this.bloomR * 0.4,
          a, 0, TAU
        )
        ctx.fill()
      }
      // Center
      ctx.fillStyle   = '#fde68a'
      ctx.globalAlpha = 1
      ctx.shadowBlur  = 6
      ctx.beginPath()
      ctx.arc(fx, fy, this.bloomR * 0.35, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
}

// ── Ecosystem World ───────────────────────────────────────────────────────────
export class EcosystemWorld {
  constructor(W, H) {
    this.W         = W
    this.H         = H
    this.groundY   = H - 30
    this.entities  = []
    this.soilWater = new Float32Array(Math.ceil(W / 8)) // water per 8px column
    this.grassGrid = new Map()   // x → Grass entity (one per column)
    this.treeGrid  = new Map()   // x → Tree entity
    this.flowerGrid = new Map()  // x → Flower entity
    this.river     = null
    this.sunActive = false
    this.frameCount = 0
    this.waterSproutThreshold = 40  // soil water needed to sprout grass
    this.grassToTreeThreshold = 200 // grass age needed to try growing tree
  }

  addEntity(e) { this.entities.push(e) }

  addSoilWater(x, amount) {
    const col = Math.floor(x / 8)
    if (col >= 0 && col < this.soilWater.length) {
      this.soilWater[col] = Math.min(255, this.soilWater[col] + amount)
    }
  }

  addSplash(x, y) { this.addEntity(new Splash(x, y)) }

  addCloud(x, y) {
    this.addEntity(new Cloud(Math.max(80, Math.min(this.W - 80, x)), Math.min(y, this.groundY * 0.4), this.W))
  }

  addSun(x, y) {
    // Remove existing sun first
    this.entities = this.entities.filter(e => !(e instanceof Sun))
    this.addEntity(new Sun(x, Math.min(y, this.groundY * 0.35)))
  }

  addRiver(y) {
    if (!this.river) {
      this.river = new River(Math.min(y, this.groundY - 5), this.W)
      this.entities.push(this.river)
    }
  }

  addRainDrop(x, y) { this.addEntity(new RainDrop(x, y)) }

  spawnGrass(x) {
    const col = Math.floor(x / 12) * 12
    if (!this.grassGrid.has(col)) {
      const g = new Grass(col + rand(-3, 3), this.groundY)
      this.grassGrid.set(col, g)
      this.entities.push(g)
    }
  }

  spawnTree(x) {
    const col = Math.floor(x / 40) * 40
    if (!this.treeGrid.has(col)) {
      const t = new Tree(col + rand(-5, 5), this.groundY)
      this.treeGrid.set(col, t)
      this.entities.push(t)
    }
  }

  spawnFlower(x) {
    const col = Math.floor(x / 20) * 20
    if (!this.flowerGrid.has(col)) {
      const f = new Flower(col + rand(-3, 3), this.groundY)
      this.flowerGrid.set(col, f)
      this.entities.push(f)
    }
  }

  update() {
    this.frameCount++
    this.sunActive = false  // reset each frame; Sun entity sets it back to true

    // Update all entities
    this.entities.forEach(e => e.update(this))
    this.entities = this.entities.filter(e => e.alive)

    // Remove dead grass/trees/flowers from grids
    this.grassGrid.forEach((g, k) => { if (!g.alive) this.grassGrid.delete(k) })
    this.treeGrid.forEach((t, k)  => { if (!t.alive) this.treeGrid.delete(k) })

    // Soil water → sprout grass
    if (this.frameCount % 8 === 0) {
      this.soilWater.forEach((water, col) => {
        if (water > this.waterSproutThreshold && Math.random() > 0.7) {
          this.spawnGrass(col * 8)
          this.soilWater[col] = Math.max(0, water - 5)
        }
        // Evaporate slowly
        this.soilWater[col] = Math.max(0, this.soilWater[col] - 0.05)
      })
    }

    // Mature grass → spawn trees (rare) or flowers (more common)
    if (this.frameCount % 60 === 0) {
      this.grassGrid.forEach((g, col) => {
        if (g.age > this.grassToTreeThreshold) {
          if (Math.random() > 0.92) {
            this.spawnTree(col)
          } else if (Math.random() > 0.8) {
            this.spawnFlower(col)
          }
        }
      })
    }

    // Cap total entities for performance
    if (this.entities.length > 300) {
      // Remove oldest non-essential entities
      this.entities = this.entities.filter(e =>
        e instanceof Tree   ||
        e instanceof River  ||
        e instanceof Cloud  ||
        e instanceof Sun    ||
        e instanceof Grass  ||
        e instanceof Flower ||
        e instanceof Fish
      ).concat(
        this.entities.filter(e =>
          !(e instanceof Tree)   &&
          !(e instanceof River)  &&
          !(e instanceof Cloud)  &&
          !(e instanceof Sun)    &&
          !(e instanceof Grass)  &&
          !(e instanceof Flower) &&
          !(e instanceof Fish)
        ).slice(-80)
      )
    }
  }

  draw(ctx) {
    // Draw soil moisture as subtle glow at ground level
    ctx.save()
    this.soilWater.forEach((water, col) => {
      if (water > 10) {
        ctx.globalAlpha = Math.min(0.3, water / 150)
        ctx.fillStyle   = '#3b82f6'
        ctx.fillRect(col * 8, this.groundY, 8, 3)
      }
    })
    ctx.restore()

    // Draw all entities
    this.entities.forEach(e => e.draw(ctx, this.W, this.H))
  }

  clear() {
    this.entities  = []
    this.grassGrid.clear()
    this.treeGrid.clear()
    this.flowerGrid.clear()
    this.soilWater.fill(0)
    this.river     = null
    this.sunActive = false
  }
}

// ── Symbol classifier ─────────────────────────────────────────────────────────
export function classifyEcosystemSymbol(strokePoints, W, H) {
  if (!strokePoints || strokePoints.length < 3) return null

  const xs = strokePoints.map(p => p.x)
  const ys = strokePoints.map(p => p.y)
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const w  = Math.max(...xs) - Math.min(...xs)
  const h  = Math.max(...ys) - Math.min(...ys)
  const groundY = H - 30

  const aspect    = w / Math.max(h, 1)
  const relativeY = cy / H  // 0 = top, 1 = bottom
  const isNearTop = relativeY < 0.45
  const isNearGround = cy > groundY * 0.8

  // Circularity
  const radii  = strokePoints.map(p => Math.hypot(p.x - cx, p.y - cy))
  const avgR   = radii.reduce((s, r) => s + r, 0) / radii.length
  const rVar   = avgR > 0
    ? Math.sqrt(radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length) / avgR
    : 1
  const isCircular = rVar < 0.35
  const closed     = Math.hypot(strokePoints[0].x - strokePoints[strokePoints.length - 1].x,
                                strokePoints[0].y - strokePoints[strokePoints.length - 1].y) < Math.hypot(w, h) * 0.4

  // Net vertical direction
  const dy = strokePoints[strokePoints.length - 1].y - strokePoints[0].y
  const dx = strokePoints[strokePoints.length - 1].x - strokePoints[0].x

  // ── Sun: circle at top ─────────────────────────────────────────────────
  if (isCircular && closed && isNearTop && avgR > 20) {
    return { type: 'sun', x: cx, y: cy }
  }

  // ── Cloud: wide bumpy stroke near top ──────────────────────────────────
  if (isNearTop && aspect > 1.5 && h < H * 0.2) {
    return { type: 'cloud', x: cx, y: cy }
  }

  // ── River: wide horizontal stroke in the middle zone ──────────────────
  if (aspect > 2.5 && !isNearTop && !isNearGround && relativeY > 0.3 && relativeY < 0.85) {
    return { type: 'river', x: cx, y: cy }
  }

  // ── Rain: short vertical strokes anywhere ──────────────────────────────
  if (aspect < 0.5 && h > 30 && dy > 0 && !closed) {
    return { type: 'rain', x: cx, y: cy - h / 2 }
  }

  // ── Tree: vertical stroke near ground ─────────────────────────────────
  if (aspect < 0.6 && isNearGround && dy < 0) {
    return { type: 'tree', x: cx, y: groundY }
  }

  // ── Seed/flower: small closed stroke near ground ──────────────────────
  if (isNearGround && (closed || Math.hypot(w, h) < 60)) {
    return { type: 'seed', x: cx, y: groundY }
  }

  return null
}