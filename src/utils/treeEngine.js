// ─── Tree generation engine ─────────────────────────────────────────────────
// Procedurally grows a beautiful recursive tree from a single stroke path

const TAU = Math.PI * 2

// Seeded pseudo-random for consistent trees (same stroke = same tree)
function seededRandom(seed) {
  let s = seed
  return function() {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// ── Core recursive branch drawer ──────────────────────────────────────────
function drawBranch(ctx, x, y, angle, length, depth, maxDepth, rand, color, config) {
  if (depth > maxDepth || length < 1.5) return

  // Calculate branch end point
  const endX = x + Math.cos(angle) * length
  const endY = y + Math.sin(angle) * length

  // Branch width tapers as we go deeper
  const lineWidth = Math.max(0.5, config.trunkWidth * Math.pow(0.62, depth))

  // Color shifts from brown trunk → green branches → lighter at tips
  const depthRatio = depth / maxDepth
  const r = Math.round(lerp(color.trunk.r, color.tip.r, depthRatio))
  const g = Math.round(lerp(color.trunk.g, color.tip.g, depthRatio))
  const b = Math.round(lerp(color.trunk.b, color.tip.b, depthRatio))
  const alpha = 0.85 + rand() * 0.15

  ctx.save()
  ctx.strokeStyle   = `rgba(${r},${g},${b},${alpha})`
  ctx.lineWidth     = lineWidth
  ctx.lineCap       = 'round'
  ctx.shadowColor   = `rgba(${r},${g},${b},0.4)`
  ctx.shadowBlur    = lineWidth * 1.5

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.restore()

  // At leaf level — draw foliage clusters
  if (depth >= maxDepth - 1) {
    drawLeafCluster(ctx, endX, endY, length, depth, maxDepth, rand, color)
    return
  }

  // Recursively grow 2-3 child branches
  const numBranches = depth < 2 ? 2 : (rand() > 0.25 ? 2 : 3)
  const spreadAngle = config.spreadAngle * (1 + rand() * 0.3)
  const lengthRatio = config.lengthRatio * (0.95 + rand() * 0.1)

  for (let i = 0; i < numBranches; i++) {
    // Spread branches symmetrically with slight random offset
    const spread = numBranches === 2
      ? (i === 0 ? -1 : 1) * spreadAngle
      : (i - 1) * spreadAngle

    const childAngle  = angle + spread + (rand() - 0.5) * 0.15
    const childLength = length * lengthRatio * (0.9 + rand() * 0.2)

    drawBranch(ctx, endX, endY, childAngle, childLength, depth + 1, maxDepth, rand, color, config)
  }
}

// ── Draw a cluster of leaves at branch tips ───────────────────────────────
function drawLeafCluster(ctx, x, y, size, depth, maxDepth, rand, color) {
  const leafCount = Math.floor(4 + rand() * 5)
  const radius    = size * 1.4

  for (let i = 0; i < leafCount; i++) {
    const angle  = rand() * TAU
    const dist   = rand() * radius
    const lx     = x + Math.cos(angle) * dist
    const ly     = y + Math.sin(angle) * dist
    const lsize  = 3 + rand() * 5

    // Vary leaf color — some more yellow, some darker green
    const hueShift = rand() * 40 - 20
    const lr = Math.round(Math.max(0, Math.min(255, color.leaf.r + hueShift)))
    const lg = Math.round(Math.max(0, Math.min(255, color.leaf.g + hueShift * 0.3)))
    const lb = Math.round(Math.max(0, Math.min(255, color.leaf.b - hueShift)))

    ctx.save()
    ctx.globalAlpha = 0.6 + rand() * 0.4
    ctx.fillStyle   = `rgb(${lr},${lg},${lb})`
    ctx.shadowColor = `rgba(${lr},${lg},${lb},0.5)`
    ctx.shadowBlur  = lsize * 0.8

    // Draw an oval leaf shape
    ctx.beginPath()
    ctx.ellipse(lx, ly, lsize * 0.6, lsize, rand() * TAU, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  // Occasional flower bloom
  if (rand() > 0.65) {
    drawFlower(ctx, x + (rand() - 0.5) * radius, y + (rand() - 0.5) * radius, 3 + rand() * 4, rand)
  }
}

// ── Draw a small flower at branch tips ────────────────────────────────────
function drawFlower(ctx, x, y, size, rand) {
  const petalCount = 5
  const petalColors = [
    [255, 182, 193], // pink
    [255, 218, 185], // peach
    [255, 255, 255], // white
    [255, 160, 122], // salmon
    [221, 160, 221], // plum
  ]
  const [pr, pg, pb] = petalColors[Math.floor(rand() * petalColors.length)]

  for (let i = 0; i < petalCount; i++) {
    const angle  = (i / petalCount) * TAU
    const px     = x + Math.cos(angle) * size
    const py     = y + Math.sin(angle) * size

    ctx.save()
    ctx.globalAlpha = 0.8
    ctx.fillStyle   = `rgb(${pr},${pg},${pb})`
    ctx.shadowColor = `rgba(${pr},${pg},${pb},0.6)`
    ctx.shadowBlur  = size
    ctx.beginPath()
    ctx.ellipse(px, py, size * 0.5, size * 0.8, angle, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  // Center dot
  ctx.save()
  ctx.fillStyle   = '#fbbf24'
  ctx.shadowColor = '#fbbf24'
  ctx.shadowBlur  = size
  ctx.beginPath()
  ctx.arc(x, y, size * 0.35, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// ── Main entry point ────────────────────────────────────────────────────────
// Takes the raw stroke points (the guide line the user drew)
// and grows a full tree from its base to its tip
export function growTree(ctx, strokePoints, color, brushSize) {
  if (!strokePoints || strokePoints.length < 2) return

  const base = strokePoints[0]
  const tip  = strokePoints[strokePoints.length - 1]

  // Calculate trunk direction from the drawn stroke
  const dx     = tip.x - base.x
  const dy     = tip.y - base.y
  const length = Math.hypot(dx, dy)
  const angle  = Math.atan2(dy, dx)

  if (length < 10) return

  // Seed random from stroke position for consistent trees
  const seed = Math.floor(base.x * 1000 + base.y)
  const rand = seededRandom(seed)

  // Tree configuration — tweak these for different tree styles
  const config = {
    trunkWidth:   Math.max(3, brushSize * 0.6),
    spreadAngle:  0.45 + rand() * 0.25,  // radians
    lengthRatio:  0.68 + rand() * 0.08,
  }

  // Color palettes based on hand color (passed in)
  const treeColor = {
    trunk: { r: 101, g: 67,  b: 33  }, // dark brown
    tip:   { r: 34,  g: 139, b: 34  }, // forest green
    leaf:  { r: 34,  g: 160, b: 60  }, // leaf green
  }

  // If a custom color was provided, tint the leaves toward it
  if (color) {
    treeColor.leaf = {
      r: Math.round(lerp(34,  color.r, 0.35)),
      g: Math.round(lerp(160, color.g, 0.35)),
      b: Math.round(lerp(60,  color.b, 0.35)),
    }
  }

  // Depth scales with stroke length — longer stroke = bigger tree
  const maxDepth = Math.min(9, Math.max(5, Math.floor(length / 30)))

  drawBranch(ctx, base.x, base.y, angle, length, 0, maxDepth, rand, treeColor, config)
}

// ── Draw the guide line shown WHILE the user is drawing ───────────────────
export function drawTreeGuide(ctx, from, to, color, brushSize) {
  if (!from || !to) return

  ctx.save()
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = '#8B5E3C'
  ctx.lineWidth   = Math.max(2, brushSize * 0.4)
  ctx.setLineDash([6, 4])
  ctx.shadowColor = '#8B5E3C'
  ctx.shadowBlur  = 8
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ── Animated tree grow — draws the tree frame by frame for a grow effect ──
export function growTreeAnimated(ctx, strokePoints, color, brushSize, onComplete) {
  if (!strokePoints || strokePoints.length < 2) return

  const base = strokePoints[0]
  const tip  = strokePoints[strokePoints.length - 1]
  const dx   = tip.x - base.x
  const dy   = tip.y - base.y
  const len  = Math.hypot(dx, dy)
  if (len < 10) return

  const seed    = Math.floor(base.x * 1000 + base.y)
  const rand    = seededRandom(seed)
  const config  = {
    trunkWidth:  Math.max(3, brushSize * 0.6),
    spreadAngle: 0.45 + rand() * 0.25,
    lengthRatio: 0.68 + rand() * 0.08,
  }
  const treeColor = {
    trunk: { r: 101, g: 67,  b: 33  },
    tip:   { r: 34,  g: 139, b: 34  },
    leaf:  { r: 34,  g: 160, b: 60  },
  }
  if (color) {
    treeColor.leaf = {
      r: Math.round(lerp(34,  color.r, 0.35)),
      g: Math.round(lerp(160, color.g, 0.35)),
      b: Math.round(lerp(60,  color.b, 0.35)),
    }
  }

  const maxDepth = Math.min(9, Math.max(5, Math.floor(len / 30)))
  const angle    = Math.atan2(dy, dx)

  // Collect all branches in order so we can animate them sequentially
  const branches = []
  collectBranches(base.x, base.y, angle, len, 0, maxDepth, rand, treeColor, config, branches)

  let i = 0
  const batchSize = Math.max(1, Math.floor(branches.length / 20)) // draw N branches per frame

  function frame() {
    const end = Math.min(i + batchSize, branches.length)
    for (; i < end; i++) {
      const b = branches[i]
      if (b.type === 'branch') {
        drawBranch(ctx, b.x, b.y, b.angle, b.length, b.depth, maxDepth, seededRandom(seed + i), treeColor, config)
      } else if (b.type === 'leaf') {
        drawLeafCluster(ctx, b.x, b.y, b.size, b.depth, maxDepth, seededRandom(seed + i * 7), treeColor)
      }
    }
    if (i < branches.length) {
      requestAnimationFrame(frame)
    } else {
      onComplete?.()
    }
  }
  requestAnimationFrame(frame)
}

// Collect branches without drawing (for animation ordering)
function collectBranches(x, y, angle, length, depth, maxDepth, rand, color, config, out) {
  if (depth > maxDepth || length < 1.5) return

  const endX = x + Math.cos(angle) * length
  const endY = y + Math.sin(angle) * length

  out.push({ type: 'branch', x, y, angle, length, depth })

  if (depth >= maxDepth - 1) {
    out.push({ type: 'leaf', x: endX, y: endY, size: length * 1.4, depth })
    return
  }

  const numBranches = depth < 2 ? 2 : (rand() > 0.25 ? 2 : 3)
  const spreadAngle = config.spreadAngle * (1 + rand() * 0.3)
  const lengthRatio = config.lengthRatio * (0.95 + rand() * 0.2)

  for (let i = 0; i < numBranches; i++) {
    const spread      = numBranches === 2 ? (i === 0 ? -1 : 1) * spreadAngle : (i - 1) * spreadAngle
    const childAngle  = angle + spread + (rand() - 0.5) * 0.15
    const childLength = length * lengthRatio * (0.9 + rand() * 0.2)
    collectBranches(endX, endY, childAngle, childLength, depth + 1, maxDepth, rand, color, config, out)
  }
}

function lerp(a, b, t) { return a + (b - a) * t }