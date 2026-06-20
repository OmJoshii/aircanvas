// ─── $1 Unistroke Recognizer ───────────────────────────────────────────
// A classic, training-free algorithm for recognizing hand-drawn gestures
// by comparing normalized point paths against template shapes.
// Reference concept: Wobbrock, Wilson & Li (2007)

const RESAMPLE_POINTS = 64   // every gesture is normalized to this many points
const SQUARE_SIZE      = 250  // bounding box size used for scale normalization
const ORIGIN           = { x: 0, y: 0 }

// ─── Step 1: Resample a path into N evenly-spaced points ──────────────
function resample(points, n) {
  const I = pathLength(points) / (n - 1)
  let D = 0
  const newPoints = [{ ...points[0] }]
  const src = points.map(p => ({ ...p })) // work on a copy, never mutate input

  let i = 1
  while (i < src.length) {
    const d = distance(src[i - 1], src[i])

    if (D + d >= I) {
      const t = (I - D) / d
      const qx = src[i - 1].x + t * (src[i].x - src[i - 1].x)
      const qy = src[i - 1].y + t * (src[i].y - src[i - 1].y)
      const q = { x: qx, y: qy }

      newPoints.push(q)

      // Replace the previous point with q so the next distance
      // calculation correctly continues from this new interpolated point,
      // without permanently growing the array or skipping segments
      src[i - 1] = q
      D = 0
      // do NOT increment i — re-evaluate distance from q to src[i]
    } else {
      D += d
      i++
    }
  }

  // Rounding can leave us one point short — pad with the final point
  while (newPoints.length < n) {
    newPoints.push({ ...points[points.length - 1] })
  }

  return newPoints
}

// ─── Step 2: Find the centroid (average position) of all points ───────
function centroid(points) {
  let x = 0, y = 0
  points.forEach(p => { x += p.x; y += p.y })
  return { x: x / points.length, y: y / points.length }
}

// ─── Step 3: Rotate the path so its indicative angle is zero ──────────
function rotateToZero(points) {
  const c = centroid(points)
  const angle = Math.atan2(points[0].y - c.y, points[0].x - c.x)
  return rotateBy(points, -angle, c)
}

function rotateBy(points, angle, c) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return points.map(p => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }))
}

// ─── Step 4: Scale the path to fit a standard bounding box ────────────
function scaleToSquare(points, size) {
  const box = boundingBox(points)
  return points.map(p => ({
    x: p.x * (size / box.width),
    y: p.y * (size / box.height),
  }))
}

function boundingBox(points) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { width: maxX - minX || 1, height: maxY - minY || 1 }
}

// ─── Step 5: Translate the path so its centroid sits at the origin ────
function translateToOrigin(points) {
  const c = centroid(points)
  return points.map(p => ({ x: p.x - c.x, y: p.y - c.y }))
}

// ─── Full normalization pipeline ───────────────────────────────────────
export function normalizeGesture(rawPoints) {
  if (rawPoints.length < 2) return null
  let pts = resample(rawPoints, RESAMPLE_POINTS)
  pts = rotateToZero(pts)
  pts = scaleToSquare(pts, SQUARE_SIZE)
  pts = translateToOrigin(pts)
  return pts
}

// ─── Compare two normalized paths — average point-to-point distance ───
function pathDistance(pts1, pts2) {
  let sum = 0
  for (let i = 0; i < pts1.length; i++) {
    sum += distance(pts1[i], pts2[i])
  }
  return sum / pts1.length
}

// ─── Helpers ────────────────────────────────────────────────────────────
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pathLength(points) {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i])
  }
  return len
}

// ─── Recognize: compare a normalized gesture against all templates ────
// Returns the best matching character and a confidence score
export function recognizeGesture(normalizedPoints, templates) {
  let bestDistance = Infinity
  let bestMatch    = null

  Object.entries(templates).forEach(([char, templatePoints]) => {
    const d = pathDistance(normalizedPoints, templatePoints)
    if (d < bestDistance) {
      bestDistance = d
      bestMatch    = char
    }
  })

  // Convert raw distance into a 0-1 confidence score
  // Smaller distance = higher confidence. This scaling is empirical —
  // tuned so typical good matches land around 0.7-0.95
  const maxDistance = 0.5 * Math.sqrt(SQUARE_SIZE ** 2 + SQUARE_SIZE ** 2)
  const score = Math.max(0, 1 - bestDistance / maxDistance)

  return { character: bestMatch, confidence: score, distance: bestDistance }
}