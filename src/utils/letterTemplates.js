import { normalizeGesture } from './gestureRecognizer'

const RAW_TEMPLATES = {

  // ── HIGHLY DISTINCT shapes ─────────────────────────────────────────────

  // Circle — trace clockwise from top
  O: [
    { x:50,y:0 },{ x:75,y:6 },{ x:93,y:25 },{ x:100,y:50 },
    { x:93,y:75 },{ x:75,y:93 },{ x:50,y:100 },{ x:25,y:93 },
    { x:7,y:75 },{ x:0,y:50 },{ x:7,y:25 },{ x:25,y:6 },
    { x:50,y:0 }, // close the loop explicitly
  ],

  // L shape — straight down then right, clear 90° corner
  L: [
    { x:20,y:0 },{ x:20,y:25 },{ x:20,y:50 },
    { x:20,y:75 },{ x:20,y:100 },
    { x:40,y:100 },{ x:60,y:100 },{ x:80,y:100 },
  ],

  // V shape — down-left then up-right, symmetric valley
  V: [
    { x:0,y:0 },{ x:15,y:30 },{ x:30,y:60 },
    { x:50,y:100 },
    { x:70,y:60 },{ x:85,y:30 },{ x:100,y:0 },
  ],

  // Z shape — top-right to left, diagonal, left to right
  Z: [
    { x:0,y:0 },{ x:33,y:0 },{ x:66,y:0 },{ x:100,y:0 },
    { x:75,y:33 },{ x:50,y:50 },{ x:25,y:66 },
    { x:0,y:100 },{ x:33,y:100 },{ x:66,y:100 },{ x:100,y:100 },
  ],

  // U shape — down, curve, up
  U: [
    { x:10,y:0 },{ x:10,y:40 },{ x:10,y:70 },
    { x:20,y:90 },{ x:50,y:100 },{ x:80,y:90 },
    { x:90,y:70 },{ x:90,y:40 },{ x:90,y:0 },
  ],

  // W shape — down, up, down, up (4 segments)
  W: [
    { x:0,y:0 },{ x:15,y:50 },{ x:25,y:100 },
    { x:50,y:50 },
    { x:75,y:100 },{ x:85,y:50 },{ x:100,y:0 },
  ],

  // N shape — up, diagonal, up
  N: [
    { x:0,y:100 },{ x:0,y:66 },{ x:0,y:33 },{ x:0,y:0 },
    { x:33,y:33 },{ x:66,y:66 },
    { x:100,y:33 },{ x:100,y:66 },{ x:100,y:100 },
  ],

  // M shape — up, down-middle, up, down
  M: [
    { x:0,y:100 },{ x:0,y:50 },{ x:0,y:0 },
    { x:50,y:60 },
    { x:100,y:0 },{ x:100,y:50 },{ x:100,y:100 },
  ],

  // X shape — diagonal cross
  X: [
    { x:0,y:0 },{ x:33,y:33 },{ x:50,y:50 },{ x:66,y:66 },{ x:100,y:100 },
    { x:50,y:50 },
    { x:100,y:0 },{ x:66,y:33 },{ x:33,y:66 },{ x:0,y:100 },
  ],

  // S shape — top-right arc, then bottom-left arc
  S: [
    { x:90,y:10 },{ x:70,y:0 },{ x:40,y:0 },{ x:15,y:15 },
    { x:10,y:35 },{ x:30,y:50 },{ x:50,y:55 },{ x:70,y:60 },
    { x:90,y:75 },{ x:85,y:90 },{ x:60,y:100 },{ x:30,y:100 },
    { x:10,y:90 },
  ],

  // C shape — top arc to bottom (open on right)
  C: [
    { x:90,y:15 },{ x:70,y:5 },{ x:45,y:0 },{ x:20,y:10 },
    { x:5,y:30 },{ x:0,y:50 },{ x:5,y:70 },
    { x:20,y:90 },{ x:45,y:100 },{ x:70,y:95 },{ x:90,y:85 },
  ],

  // I shape — crossbar top, vertical, crossbar bottom
  I: [
    { x:20,y:0 },{ x:50,y:0 },{ x:80,y:0 },   // top crossbar
    { x:50,y:0 },{ x:50,y:33 },{ x:50,y:66 },{ x:50,y:100 },  // stem
    { x:20,y:100 },{ x:50,y:100 },{ x:80,y:100 }, // bottom crossbar
  ],

  // 0 — rounder, shorter than O
  0: [
    { x:50,y:5 },{ x:75,y:12 },{ x:92,y:30 },{ x:95,y:50 },
    { x:92,y:70 },{ x:75,y:88 },{ x:50,y:95 },{ x:25,y:88 },
    { x:8,y:70 },{ x:5,y:50 },{ x:8,y:30 },{ x:25,y:12 },
    { x:50,y:5 },
  ],

  // 1 — angled top then straight down with base
  1: [
    { x:30,y:25 },{ x:50,y:0 },
    { x:50,y:33 },{ x:50,y:66 },{ x:50,y:100 },
    { x:30,y:100 },{ x:70,y:100 },
  ],

  // 7 — top bar then diagonal down-left
  7: [
    { x:0,y:0 },{ x:33,y:0 },{ x:66,y:0 },{ x:100,y:0 },
    { x:80,y:33 },{ x:60,y:66 },{ x:40,y:100 },
  ],

}

export const LETTER_TEMPLATES = Object.fromEntries(
  Object.entries(RAW_TEMPLATES).map(([char, points]) => [
    char,
    normalizeGesture(points),
  ])
)