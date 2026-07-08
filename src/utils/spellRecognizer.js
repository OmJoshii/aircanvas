// ─── Spell recognition from stroke geometry ─────────────────────────────────
// No ML, no templates — pure geometric analysis of stroke properties

// Resample stroke to fixed number of points for consistent analysis
function resample(points, n = 32) {
  if (points.length < 2) return points
  const result = [points[0]]
  let D = 0
  const totalLen = pathLength(points)
  const interval = totalLen / (n - 1)
  const src = points.map(p => ({ ...p }))

  let i = 1
  while (i < src.length) {
    const d = dist(src[i - 1], src[i])
    if (D + d >= interval) {
      const t = (interval - D) / d
      const q = {
        x: src[i - 1].x + t * (src[i].x - src[i - 1].x),
        y: src[i - 1].y + t * (src[i].y - src[i - 1].y),
      }
      result.push(q)
      src[i - 1] = q
      D = 0
    } else {
      D += d
      i++
    }
  }
  while (result.length < n) result.push(points[points.length - 1])
  return result
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function pathLength(pts) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

function centroid(pts) {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}

function boundingBox(pts) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  }
}

// Count how many times the stroke changes direction significantly
function countDirectionChanges(pts, threshold = 0.8) {
  let changes = 0
  for (let i = 2; i < pts.length - 1; i++) {
    const v1 = { x: pts[i].x - pts[i - 2].x, y: pts[i].y - pts[i - 2].y }
    const v2 = { x: pts[i + 1].x - pts[i - 1].x, y: pts[i + 1].y - pts[i - 1].y }
    const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y)
    if (l1 < 1 || l2 < 1) continue
    const dot = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2)
    if (dot < -threshold) changes++
  }
  return changes
}

// Measure how "circular" a stroke is
// Returns 0 (not circular) to 1 (perfect circle)
function circularityScore(pts) {
  const c   = centroid(pts)
  const radii = pts.map(p => dist(p, c))
  const avg = radii.reduce((s, r) => s + r, 0) / radii.length
  if (avg < 1) return 0
  const variance = radii.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / radii.length
  return 1 / (1 + variance / (avg * avg))
}

// Check if stroke starts and ends near each other (closed shape)
function isClosed(pts, threshold = 0.25) {
  const bbox = boundingBox(pts)
  const diag = Math.hypot(bbox.w, bbox.h)
  return dist(pts[0], pts[pts.length - 1]) < diag * threshold
}

// Measure net rotation direction of the stroke
function netRotation(pts) {
  let angle = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const a1 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
    const a2 = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x)
    let da = a2 - a1
    if (da > Math.PI)  da -= 2 * Math.PI
    if (da < -Math.PI) da += 2 * Math.PI
    angle += da
  }
  return angle // positive = CCW, negative = CW
}

// Check if the stroke crosses itself (like a figure-8 or star)
function selfIntersectionCount(pts) {
  let count = 0
  const step = Math.max(1, Math.floor(pts.length / 16))
  for (let i = 0; i < pts.length - step - 1; i += step) {
    const p1 = pts[i]
    const p2 = pts[i + step]
    if (!p1 || !p2) continue  // guard against undefined

    for (let j = i + step * 2; j < pts.length - 1; j += step) {
      const p3 = pts[j]
      const p4 = pts[j + step] || pts[pts.length - 1] // fallback to last point
      if (!p3 || !p4) continue  // guard against undefined

      if (segmentsIntersect(p1, p2, p3, p4)) count++
    }
  }
  return count
}

function segmentsIntersect(p1, p2, p3, p4) {
  // Guard all four points
  if (!p1 || !p2 || !p3 || !p4) return false
  if (p1.x === undefined || p2.x === undefined ||
      p3.x === undefined || p4.x === undefined) return false

  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y }
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y }
  const cross = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(cross) < 0.001) return false
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / cross
  const u = ((p3.x - p1.x) * d1.y - (p3.y - p1.y) * d1.x) / cross
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

// ─── Main recognition function ───────────────────────────────────────────────
export function recognizeSpell(rawPoints) {
  if (!rawPoints || rawPoints.length < 8) return null

  const pts         = resample(rawPoints, 48)
  const bbox        = boundingBox(pts)
  const circularity = circularityScore(pts)
  const closed      = isClosed(pts, 0.3)
  const rotation    = netRotation(pts)
  const dirChanges  = countDirectionChanges(pts, 0.7)
  const crossings   = selfIntersectionCount(pts)
  const c           = centroid(pts)
  const bbox_diag   = Math.hypot(bbox.w, bbox.h)
  const aspectRatio = bbox.w / Math.max(bbox.h, 1)

  console.log(`SPELL | circ:${circularity.toFixed(2)} closed:${closed} rot:${rotation.toFixed(1)} dir:${dirChanges} cross:${crossings} aspect:${aspectRatio.toFixed(2)}`)

  // ── STAR first — multiple crossings + many direction changes ─────────────
  // Most specific — must match before anything else
  if (crossings >= 3 && dirChanges >= 4) {
    return { spell: 'star', label: 'Stardust', emoji: '⭐', x: c.x, y: c.y, radius: bbox_diag / 2 }
  }

  // ── SPIRAL — very high net rotation, not closed ──────────────────────────
  // Spiral must be checked before circle — it has high rotation but isn't closed
  if (Math.abs(rotation) > Math.PI * 3.5 && !closed) {
    return { spell: 'galaxy', label: 'Galaxy', emoji: '🌌', x: c.x, y: c.y, radius: bbox_diag / 2 }
  }

  // ── WAVE — many direction changes, wide and horizontal, not closed ────────
  if (!closed && dirChanges >= 5 && aspectRatio > 1.8) {
    return { spell: 'wave', label: 'Wave', emoji: '🌊', x: c.x, y: c.y, radius: bbox_diag / 2 }
  }

  // ── LIGHTNING / Z-BOLT — exactly 2-3 direction changes, not closed ────────
  // Must come before heart — Z is open, heart is closed
  if (!closed && dirChanges >= 2 && dirChanges <= 4 &&
      circularity < 0.45 && crossings === 0) {
    return { spell: 'lightning', label: 'Lightning', emoji: '⚡', x: c.x, y: c.y, radius: bbox_diag / 2 }
  }

  // ── HEART — closed shape with 2-4 direction changes, NOT highly circular ──
  // A heart is closed but has bumps (direction changes) — distinguishes it from circle
  if (closed && dirChanges >= 2 && dirChanges <= 5 &&
      circularity < 0.72 && crossings <= 1) {
    return { spell: 'heart', label: 'Love', emoji: '💖', x: c.x, y: c.y, radius: bbox_diag / 2 }
  }

  // ── CIRCLE / PORTAL — closed, highly circular, minimal direction changes ──
  // Most general — checked last so specific shapes aren't swallowed by it
  if (circularity > 0.68 && closed && Math.abs(rotation) > Math.PI * 0.8 && dirChanges <= 2) {
    return { spell: 'portal', label: 'Portal', emoji: '🌀', x: c.x, y: c.y, radius: (bbox.w + bbox.h) / 4 }
  }

  return null
}