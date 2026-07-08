// ─── Direction-sequence based spell recognition ─────────────────────────────
// Instead of analyzing the final shape geometry, we analyze the SEQUENCE
// of directions the hand moved through while drawing. This is far more
// robust for imprecise real-time hand tracking because it captures
// drawing behavior, not shape appearance.

const DIR_NONE  = 'none'
const DIR_RIGHT = 'R'
const DIR_LEFT  = 'L'
const DIR_UP    = 'U'
const DIR_DOWN  = 'D'
const DIR_UR    = 'UR'
const DIR_UL    = 'UL'
const DIR_DR    = 'DR'
const DIR_DL    = 'DL'

// Convert a displacement vector to a cardinal/diagonal direction
function vectorToDir(dx, dy) {
  const len = Math.hypot(dx, dy)
  if (len < 4) return DIR_NONE // too small to have direction

  const nx = dx / len
  const ny = dy / len

  // Map to 8 directions
  const angle = Math.atan2(ny, nx) * 180 / Math.PI

  if (angle >= -22.5  && angle <  22.5)  return DIR_RIGHT
  if (angle >=  22.5  && angle <  67.5)  return DIR_DR
  if (angle >=  67.5  && angle < 112.5)  return DIR_DOWN
  if (angle >= 112.5  && angle < 157.5)  return DIR_DL
  if (angle >= 157.5  || angle < -157.5) return DIR_LEFT
  if (angle >= -157.5 && angle < -112.5) return DIR_UL
  if (angle >= -112.5 && angle < -67.5)  return DIR_UP
  if (angle >= -67.5  && angle < -22.5)  return DIR_UR
  return DIR_NONE
}

// Segment raw points into a sequence of dominant directions
// Groups consecutive points moving in the same direction into segments
function getDirectionSequence(points) {
  if (points.length < 4) return []

  // Step 1: compute direction for each consecutive chunk
  const chunkSize = Math.max(3, Math.floor(points.length / 20))
  const rawDirs   = []

  for (let i = 0; i < points.length - chunkSize; i += Math.max(1, Math.floor(chunkSize / 2))) {
    const dx = points[i + chunkSize].x - points[i].x
    const dy = points[i + chunkSize].y - points[i].y
    const dir = vectorToDir(dx, dy)
    if (dir !== DIR_NONE) rawDirs.push(dir)
  }

  // Step 2: collapse consecutive identical directions into runs
  const sequence = []
  let prev = null
  for (const dir of rawDirs) {
    if (dir !== prev) {
      sequence.push(dir)
      prev = dir
    }
  }

  return sequence
}

// Count how many times the stroke makes a sharp reversal
// (opposite or near-opposite directions back to back)
function countReversals(seq) {
  const opposites = {
    R: ['L'], L: ['R'],
    U: ['D'], D: ['U'],
    UR: ['DL', 'L'], UL: ['DR', 'R'],
    DR: ['UL', 'L'], DL: ['UR', 'R'],
  }
  let count = 0
  for (let i = 1; i < seq.length; i++) {
    const opp = opposites[seq[i - 1]] || []
    if (opp.includes(seq[i])) count++
  }
  return count
}

// Check if stroke is predominantly rotational (circle/spiral)
function isRotational(points) {
  let totalAngle = 0
  for (let i = 2; i < points.length; i++) {
    const a1 = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x)
    const a2 = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x)
    let da = a2 - a1
    if (da >  Math.PI) da -= 2 * Math.PI
    if (da < -Math.PI) da += 2 * Math.PI
    totalAngle += da
  }
  return { totalAngle, turns: Math.abs(totalAngle) / (2 * Math.PI) }
}

// Is the stroke closed (end near start)?
function isClosed(points, threshold = 0.25) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const w  = Math.max(...xs) - Math.min(...xs)
  const h  = Math.max(...ys) - Math.min(...ys)
  const d  = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y)
  return d < Math.hypot(w, h) * threshold
}

function centroid(points) {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  }
}

function boundingDiag(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const w  = Math.max(...xs) - Math.min(...xs)
  const h  = Math.max(...ys) - Math.min(...ys)
  return Math.hypot(w, h)
}

// ─── Main recognition ────────────────────────────────────────────────────────
export function recognizeSpell(rawPoints) {
  if (!rawPoints || rawPoints.length < 8) return null

  const seq       = getDirectionSequence(rawPoints)
  const reversals = countReversals(seq)
  const { totalAngle, turns } = isRotational(rawPoints)
  const closed    = isClosed(rawPoints)
  const c         = centroid(rawPoints)
  const radius    = boundingDiag(rawPoints) / 2

  const xs = rawPoints.map(p => p.x), ys = rawPoints.map(p => p.y)
  const w  = Math.max(...xs) - Math.min(...xs)
  const h  = Math.max(...ys) - Math.min(...ys)
  const aspect = w / Math.max(h, 1)

  console.log(`SPELL seq:[${seq.join(',')}] rev:${reversals} turns:${turns.toFixed(2)} closed:${closed} aspect:${aspect.toFixed(2)}`)

  // ── SPIRAL / GALAXY ──────────────────────────────────────────────────────
  // More than 1.5 full turns AND not closed (keeps spiraling outward)
  if (turns > 1.5 && !closed) {
    return { spell: 'galaxy', label: 'Galaxy', emoji: '🌌', x: c.x, y: c.y, radius }
  }

  // ── CIRCLE / PORTAL ──────────────────────────────────────────────────────
  // 0.7–1.5 full turns AND closed (comes back to start) AND few reversals
  if (turns > 0.7 && turns <= 1.5 && closed && reversals <= 1) {
    return { spell: 'portal', label: 'Portal', emoji: '🌀', x: c.x, y: c.y, radius }
  }

  // ── STAR / STARDUST ──────────────────────────────────────────────────────
  // 4+ reversals (the sharp points of a star) + enough angular movement
  if (reversals >= 4 && turns > 0.5) {
    return { spell: 'star', label: 'Stardust', emoji: '⭐', x: c.x, y: c.y, radius }
  }

  // ── HEART / LOVE ─────────────────────────────────────────────────────────
  // Closed, 2–3 reversals (the two humps + return), moderate turns
  if (closed && reversals >= 2 && reversals <= 3 && turns > 0.3 && turns < 1.2) {
    return { spell: 'heart', label: 'Love', emoji: '💖', x: c.x, y: c.y, radius }
  }

  // ── LIGHTNING / Z-BOLT ───────────────────────────────────────────────────
  // Not closed, exactly 2 reversals (right → diagonal → right for Z shape)
  // + wide horizontal extent
  if (!closed && reversals === 2 && turns < 0.5 && aspect > 0.6) {
    return { spell: 'lightning', label: 'Lightning', emoji: '⚡', x: c.x, y: c.y, radius }
  }

  // ── WAVE ─────────────────────────────────────────────────────────────────
  // Not closed, 4+ reversals but low turns (oscillating, not rotating)
  if (!closed && reversals >= 4 && turns < 0.8 && aspect > 1.5) {
    return { spell: 'wave', label: 'Wave', emoji: '🌊', x: c.x, y: c.y, radius }
  }

  return null
}