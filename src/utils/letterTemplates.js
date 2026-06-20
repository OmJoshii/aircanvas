import { normalizeGesture } from './gestureRecognizer'

// Each template is defined as a simple path of {x, y} points describing
// the idealized shape of that character, as if drawn on a 0-100 grid.
// These get normalized the same way live gestures do, so they're
// directly comparable.

const RAW_TEMPLATES = {
  O: [
    { x: 50, y: 0 }, { x: 75, y: 10 }, { x: 95, y: 35 }, { x: 100, y: 50 },
    { x: 95, y: 70 }, { x: 75, y: 90 }, { x: 50, y: 100 }, { x: 25, y: 90 },
    { x: 5, y: 70 }, { x: 0, y: 50 }, { x: 5, y: 30 }, { x: 25, y: 10 },
    { x: 50, y: 0 },
  ],
  C: [
    { x: 90, y: 10 }, { x: 60, y: 0 }, { x: 30, y: 5 }, { x: 10, y: 25 },
    { x: 0, y: 50 }, { x: 10, y: 75 }, { x: 30, y: 95 }, { x: 60, y: 100 },
    { x: 90, y: 90 },
  ],
  I: [
    { x: 50, y: 0 }, { x: 50, y: 100 },
  ],
  L: [
    { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ],
  V: [
    { x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 },
  ],
  N: [
    { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 },
  ],
  M: [
    { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 50, y: 60 },
    { x: 100, y: 0 }, { x: 100, y: 100 },
  ],
  Z: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ],
  S: [
    { x: 90, y: 10 }, { x: 50, y: 0 }, { x: 10, y: 15 }, { x: 20, y: 40 },
    { x: 60, y: 50 }, { x: 90, y: 65 }, { x: 80, y: 90 }, { x: 40, y: 100 },
    { x: 10, y: 90 },
  ],
  U: [
    { x: 0, y: 0 }, { x: 0, y: 70 }, { x: 20, y: 95 }, { x: 50, y: 100 },
    { x: 80, y: 95 }, { x: 100, y: 70 }, { x: 100, y: 0 },
  ],
  X: [
    { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 },
    { x: 100, y: 0 }, { x: 0, y: 100 },
  ],
  W: [
    { x: 0, y: 0 }, { x: 25, y: 100 }, { x: 50, y: 40 },
    { x: 75, y: 100 }, { x: 100, y: 0 },
  ],
  1: [
    { x: 30, y: 20 }, { x: 50, y: 0 }, { x: 50, y: 100 },
  ],
  7: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 35, y: 100 },
  ],
  0: [
    { x: 50, y: 0 }, { x: 80, y: 15 }, { x: 100, y: 50 }, { x: 80, y: 85 },
    { x: 50, y: 100 }, { x: 20, y: 85 }, { x: 0, y: 50 }, { x: 20, y: 15 },
    { x: 50, y: 0 },
  ],
}

// Pre-normalize all templates once at module load time so recognition
// at runtime is just comparison, not repeated normalization work
// Mirror templates horizontally to match the mirrored coordinate space
// produced by getIndexTipPosition (since the camera feed is mirrored
// for a natural "looking in a mirror" drawing experience)
function mirrorX(points) {
  return points.map(p => ({ x: 100 - p.x, y: p.y }))
}

export const LETTER_TEMPLATES = Object.fromEntries(
  Object.entries(RAW_TEMPLATES).map(([char, points]) => [
    char,
    normalizeGesture(mirrorX(points)),
  ])
)