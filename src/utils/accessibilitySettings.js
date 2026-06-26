// Simple module-level state shared across the app
// Using a plain object + listeners instead of React context
// so DrawingCanvas (which runs outside React's render cycle) can read it too

const settings = {
  oneHandedMode:   false,
  largerCursor:    false,
  highContrast:    false,
  voiceCommands:   false,
  dwellToDraw:     false,
  dwellDrawMs:     800,
}

const listeners = new Set()

export function getAccessibilitySettings() {
  return { ...settings }
}

export function updateAccessibilitySettings(updates) {
  Object.assign(settings, updates)
  listeners.forEach(fn => fn({ ...settings }))
}

export function subscribeAccessibility(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}