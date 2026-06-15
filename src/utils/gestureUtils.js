// ─── Finger landmark indices ───────────────────────────────────────────
const FINGER_TIPS  = { index: 8,  middle: 12, ring: 16, pinky: 20 }
const FINGER_BASES = { index: 5,  middle: 9,  ring: 13, pinky: 17 }
const THUMB_TIP    = 4
const INDEX_TIP    = 8

// ─── Distance between two landmarks ───────────────────────────────────
export function landmarkDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// ─── Is a specific finger extended? ───────────────────────────────────
function isFingerUp(landmarks, finger) {
  const tip  = landmarks[FINGER_TIPS[finger]]
  const base = landmarks[FINGER_BASES[finger]]
  // Tip must be significantly above base (lower y = higher on screen)
  return tip.y < base.y - 0.04
}

// ─── Pinch detection ──────────────────────────────────────────────────
// Uses hysteresis to prevent flickering
// prevPinching = the pinch state from the last frame
export function detectPinch(landmarks, prevPinching) {
  const thumbTip = landmarks[THUMB_TIP]
  const indexTip = landmarks[INDEX_TIP]
  const dist     = landmarkDistance(thumbTip, indexTip)

  if (prevPinching) {
    // Was pinching — only stop if distance grows beyond release threshold
    return dist < 0.10
  } else {
    // Was not pinching — only start if distance shrinks below engage threshold
    return dist < 0.06
  }
}

// ─── Fist detection ───────────────────────────────────────────────────
export function detectFist(landmarks) {
  return Object.keys(FINGER_TIPS).every(finger => !isFingerUp(landmarks, finger))
}

// ─── Open palm detection ──────────────────────────────────────────────
export function detectOpenPalm(landmarks) {
  return Object.keys(FINGER_TIPS).every(finger => isFingerUp(landmarks, finger))
}

// ─── Full gesture for one hand ────────────────────────────────────────
// Returns: 'pinch' | 'fist' | 'open' | 'neutral'
export function getGesture(landmarks, prevPinching = false) {
  if (detectPinch(landmarks, prevPinching)) return 'pinch'
  if (detectFist(landmarks))               return 'fist'
  if (detectOpenPalm(landmarks))           return 'open'
  return 'neutral'
}

// ─── Index fingertip screen position ─────────────────────────────────
// This is our drawing point
export function getIndexTipPosition(landmarks, W, H) {
  const tip = landmarks[INDEX_TIP]
  return {
    x: (1 - tip.x) * W, // mirror x to match video
    y: tip.y * H,
  }
}

// ─── Wrist position ───────────────────────────────────────────────────
// Used as center point for fist eraser
export function getWristPosition(landmarks, W, H) {
  const wrist = landmarks[0]
  return {
    x: (1 - wrist.x) * W,
    y: wrist.y * H,
  }
}

// ─── Distance between two hands ───────────────────────────────────────
// Used to control brush size
export function getHandSpread(hand1Landmarks, hand2Landmarks) {
  const w1 = hand1Landmarks[0]
  const w2 = hand2Landmarks[0]
  return landmarkDistance(w1, w2)
}