import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// ─── Internal state ─────────────────────────────────────────────────────────
const state = {
  videoEl:        null,
  landmarker:     null,
  handsRef:       { current: [] },
  animFrameId:    null,
  cursor:         { x: 0, y: 0, visible: false },
  pinchActive:    false,
  registeredHover:  new Map(), // element -> { callback, dwellMs, dwellStart }
  registeredSelect: new Map(), // element -> { callback, dwellMs, dwellStart, triggered }
  pinchListeners: [],
  swipeListeners: [],
  swipeHistory:   [],
  ready:          false,
}

const DEFAULT_DWELL_MS = 700
const SWIPE_THRESHOLD   = 0.15
const SWIPE_FRAMES      = 12

// ─── Public API ──────────────────────────────────────────────────────────────

const GestureOS = {

  // Initialize: load MediaPipe model and start tracking from a video element
  async init(videoElement, options = {}) {
    state.videoEl = videoElement

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    state.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands:    options.numHands || 1,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence:  0.4,
      minTrackingConfidence:      0.4,
    })

    state.ready = true
    startLoop()
    return true
  },

  // Stop everything and release resources
  destroy() {
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId)
    state.registeredHover.clear()
    state.registeredSelect.clear()
    state.pinchListeners = []
    state.swipeListeners = []
    state.ready = false
  },

  // Register a DOM element as hoverable — fires callback(progress) every frame while hovered
  onHover(element, callback) {
    state.registeredHover.set(element, { callback })
    return () => state.registeredHover.delete(element)
  },

  // Register a DOM element as selectable via dwell — fires callback() once when dwell completes
  onSelect(element, callback, dwellMs = DEFAULT_DWELL_MS) {
    state.registeredSelect.set(element, { callback, dwellMs, dwellStart: null, triggered: false })
    return () => state.registeredSelect.delete(element)
  },

  // Subscribe to pinch start/end events globally
  onPinch(callback) {
    state.pinchListeners.push(callback)
    return () => {
      state.pinchListeners = state.pinchListeners.filter(fn => fn !== callback)
    }
  },

  // Subscribe to swipe events: callback receives 'left' | 'right' | 'up' | 'down'
  onSwipe(callback) {
    state.swipeListeners.push(callback)
    return () => {
      state.swipeListeners = state.swipeListeners.filter(fn => fn !== callback)
    }
  },

  // Get the current cursor position in screen pixel coordinates
  cursor() {
    return { ...state.cursor }
  },

  isReady() {
    return state.ready
  },
}

// ─── Internal tracking loop ───────────────────────────────────────────────────

function startLoop() {
  function loop() {
    const video = state.videoEl
    if (video && video.readyState >= 2 && state.landmarker) {
      const result = state.landmarker.detectForVideo(video, performance.now())

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        updateCursor(landmarks, video)
        updatePinch(landmarks)
        updateSwipe(landmarks)
        updateHoverAndSelect()
        state.cursor.visible = true
      } else {
        state.cursor.visible = false
        state.pinchActive = false
      }
    }

    state.animFrameId = requestAnimationFrame(loop)
  }
  loop()
}

// Convert normalized index fingertip position to screen pixel coordinates
function updateCursor(landmarks, video) {
  const tip = landmarks[8]
  // Mirror x to match a mirrored video feed, mapped to actual window size
  state.cursor.x = (1 - tip.x) * window.innerWidth
  state.cursor.y = tip.y * window.innerHeight
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function updatePinch(landmarks) {
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const d = distance(thumbTip, indexTip)

  const wasPinching = state.pinchActive
  const isPinching  = wasPinching ? d < 0.10 : d < 0.06
  state.pinchActive = isPinching

  if (isPinching && !wasPinching) {
    state.pinchListeners.forEach(fn => fn('start'))
  } else if (!isPinching && wasPinching) {
    state.pinchListeners.forEach(fn => fn('end'))
  }
}

function updateSwipe(landmarks) {
  const wrist = landmarks[0]
  state.swipeHistory.push({ x: wrist.x, y: wrist.y, t: performance.now() })
  if (state.swipeHistory.length > SWIPE_FRAMES) state.swipeHistory.shift()
  if (state.swipeHistory.length < SWIPE_FRAMES) return

  const oldest = state.swipeHistory[0]
  const newest = state.swipeHistory[state.swipeHistory.length - 1]
  const dx = newest.x - oldest.x
  const dy = newest.y - oldest.y
  const dt = newest.t - oldest.t

  if (dt > 700) return

  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    const dir = dx > 0 ? 'left' : 'right' // mirrored
    state.swipeListeners.forEach(fn => fn(dir))
    state.swipeHistory = []
  } else if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
    const dir = dy > 0 ? 'down' : 'up'
    state.swipeListeners.forEach(fn => fn(dir))
    state.swipeHistory = []
  }
}

// Check which registered elements the cursor is currently over,
// fire hover callbacks every frame, and track dwell time for select callbacks
function updateHoverAndSelect() {
  const { x, y } = state.cursor
  const now = performance.now()

  state.registeredHover.forEach(({ callback }, element) => {
    const rect = element.getBoundingClientRect()
    const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    callback(isOver, { x, y })
  })

  state.registeredSelect.forEach((entry, element) => {
    const rect = element.getBoundingClientRect()
    const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

    if (isOver) {
      if (entry.dwellStart === null) {
        entry.dwellStart = now
        entry.triggered  = false
      }
      const progress = Math.min((now - entry.dwellStart) / entry.dwellMs, 1)

      // Dispatch a custom event with progress so UI can show a ring/fill
      element.dispatchEvent(new CustomEvent('gestureos:dwell', { detail: { progress } }))

      if (progress >= 1 && !entry.triggered) {
        entry.triggered = true
        entry.callback()
      }
    } else {
      if (entry.dwellStart !== null) {
        element.dispatchEvent(new CustomEvent('gestureos:dwell', { detail: { progress: 0 } }))
      }
      entry.dwellStart = null
      entry.triggered  = false
    }
  })
}

export default GestureOS