// ─── Reliable spell recognition based on what hand tracking does well ────────
// Rather than detecting complex drawn shapes (which fail due to tracking jitter),
// we recognize simple, unambiguous patterns: fast directional swipes,
// circular motion, and spiral growth — all of which produce clean signal.

function centroid(points) {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  }
}

function boundingDiag(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

// Net rotation in radians — positive = CCW, negative = CW
function netRotation(points) {
  let angle = 0
  for (let i = 2; i < points.length; i++) {
    const a1 = Math.atan2(points[i-1].y - points[i-2].y, points[i-1].x - points[i-2].x)
    const a2 = Math.atan2(points[i].y   - points[i-1].y, points[i].x   - points[i-1].x)
    let da = a2 - a1
    if (da >  Math.PI) da -= 2 * Math.PI
    if (da < -Math.PI) da += 2 * Math.PI
    angle += da
  }
  return angle
}

function isClosed(points, threshold = 0.28) {
  const diag = boundingDiag(points)
  if (diag < 1) return false
  return Math.hypot(
    points[0].x - points[points.length - 1].x,
    points[0].y - points[points.length - 1].y
  ) < diag * threshold
}

// Measure how much the stroke radius varies around its centroid
// Low variance = consistent circle, high variance = star-like spikes
function radiusVariance(points) {
  const c   = centroid(points)
  const rs  = points.map(p => Math.hypot(p.x - c.x, p.y - c.y))
  const avg = rs.reduce((s, r) => s + r, 0) / rs.length
  if (avg < 1) return 0
  return Math.sqrt(rs.reduce((s, r) => s + (r - avg) ** 2, 0) / rs.length) / avg
}

// Count how many times the radius from centroid spikes above average
// (each spike = one point of a star)
function countRadiusSpikes(points) {
  const c   = centroid(points)
  const rs  = points.map(p => Math.hypot(p.x - c.x, p.y - c.y))
  const avg = rs.reduce((s, r) => s + r, 0) / rs.length
  const thresh = avg * 1.3

  let spikes = 0
  let wasAbove = false
  rs.forEach(r => {
    const above = r > thresh
    if (above && !wasAbove) spikes++
    wasAbove = above
  })
  return spikes
}

// Dominant direction of the whole stroke
function dominantDirection(points) {
  const first = points[0]
  const last  = points[points.length - 1]
  const dx    = last.x - first.x
  const dy    = last.y - first.y
  const len   = Math.hypot(dx, dy)
  if (len < 20) return null
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  if (angle > -45  && angle <=  45)  return 'right'
  if (angle >  45  && angle <= 135)  return 'down'
  if (angle > -135 && angle <= -45)  return 'up'
  return 'left'
}

// How fast the stroke moves overall (pixels per point)
function strokeSpeed(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y)
  }
  return total / points.length
}

// ─── Main recognizer ─────────────────────────────────────────────────────────
export function recognizeSpell(rawPoints) {
  if (!rawPoints || rawPoints.length < 8) return null

  const c        = centroid(rawPoints)
  const radius   = boundingDiag(rawPoints) / 2
  const rotation = netRotation(rawPoints)
  const turns    = Math.abs(rotation) / (2 * Math.PI)
  const closed   = isClosed(rawPoints)
  const rVar     = radiusVariance(rawPoints)
  const spikes   = countRadiusSpikes(rawPoints)
  const dir      = dominantDirection(rawPoints)
  const speed    = strokeSpeed(rawPoints)

  const xs     = rawPoints.map(p => p.x), ys = rawPoints.map(p => p.y)
  const w      = Math.max(...xs) - Math.min(...xs)
  const h      = Math.max(...ys) - Math.min(...ys)
  const aspect = w / Math.max(h, 1)

  console.log(`SPELL turns:${turns.toFixed(2)} closed:${closed} rVar:${rVar.toFixed(2)} spikes:${spikes} dir:${dir} aspect:${aspect.toFixed(2)} speed:${speed.toFixed(1)}`)

  // ── SPIRAL / GALAXY ──────────────────────────────────────────────────────
  // More than 1.8 full turns AND not closed = spiral
  if (turns > 1.8 && !closed) {
    return { spell: 'galaxy', label: 'Galaxy', emoji: '🌌', x: c.x, y: c.y, radius }
  }

  // ── STAR / STARDUST ──────────────────────────────────────────────────────
  // Closed, many radius spikes (the points of the star), high radius variance
  // A star drawn in air consistently shows 4-6 radius spikes regardless of
  // how rough the drawing is — because the points genuinely go far out
  if (closed && spikes >= 4 && rVar > 0.28) {
    return { spell: 'star', label: 'Stardust', emoji: '⭐', x: c.x, y: c.y, radius }
  }

  // ── HEART / LOVE ─────────────────────────────────────────────────────────
  // Closed, exactly 2-3 radius spikes (the two humps), moderate variance
  // A heart has two bumps at top and narrows at bottom — distinctly different
  // from a star (which has more spikes) and a circle (which has 0-1 spikes)
  if (closed && spikes >= 2 && spikes <= 3 && rVar > 0.12 && rVar < 0.32) {
    return { spell: 'heart', label: 'Love', emoji: '💖', x: c.x, y: c.y, radius }
  }

  // ── CIRCLE / PORTAL ──────────────────────────────────────────────────────
  // Closed, low radius variance (consistent distance from center = circle)
  // very few spikes
  if (closed && turns > 0.6 && rVar < 0.18 && spikes <= 2) {
    return { spell: 'portal', label: 'Portal', emoji: '🌀', x: c.x, y: c.y, radius }
  }

  // ── LIGHTNING / Z-BOLT ───────────────────────────────────────────────────
  // NOT closed, fast stroke, wide horizontal aspect
  // A Z is drawn quickly left-to-right overall with a diagonal in middle
  if (!closed && aspect > 0.8 && speed > 5 && turns < 0.6) {
    return { spell: 'lightning', label: 'Lightning', emoji: '⚡', x: c.x, y: c.y, radius }
  }

  // ── WAVE ─────────────────────────────────────────────────────────────────
  // Not closed, very wide (horizontal), slow/medium speed, low turns
  if (!closed && aspect > 1.8 && turns < 0.5) {
    return { spell: 'wave', label: 'Wave', emoji: '🌊', x: c.x, y: c.y, radius }
  }

  return null
}