# ✦ Air Canvas

Draw glowing art in the air using nothing but your hands and a webcam — no touch, no stylus, no mouse.

## Live Demo
[aircanvas.vercel.app](https://your-deployed-url.vercel.app)

## How It Works

Air Canvas uses real-time hand tracking to turn your fingertips into a digital paintbrush:

- **Pinch one hand** (index finger + thumb together) to trigger drawing
- **Move the other hand** to paint glowing, particle-trailed strokes
- **Make a fist** to erase
- **Open both palms** and hold for a second to clear the entire canvas
- **Show a peace sign on both hands** and spread them apart or together to resize your brush

Each hand draws in a different color palette — your left hand paints in cool tones (indigo, violet, cyan), your right hand paints in warm tones (pink, orange, amber) — creating naturally colorful artwork without any manual color picking.

## Tech Stack

- **React + Vite** — UI and build tooling
- **MediaPipe Hand Landmarker** — real-time dual-hand tracking running entirely in-browser via WebAssembly
- **HTML5 Canvas API** — custom rendering engine for glow effects, particle trails, and smooth bezier strokes
- **Tailwind CSS** — styling

## Key Engineering Details

- Hand tracking runs in a `requestAnimationFrame` loop decoupled from React's render cycle, reading hand data through refs to maintain 60fps performance without unnecessary re-renders
- Gesture detection (pinch, fist, open palm, peace sign) is computed from raw landmark geometry — no machine learning model required beyond MediaPipe's hand detection itself
- Drawing strokes are smoothed using linear interpolation between frames to eliminate gaps caused by inconsistent detection timing
- Undo functionality captures canvas snapshots only at stroke boundaries (not every frame) to keep memory usage minimal
- Brush sizing uses a "lock-in" gesture pattern — size only changes while actively in a resize gesture, then persists until the gesture is repeated

## Running Locally

\`\`\`bash
git clone https://github.com/OmJoshii/aircanvas.git
cd aircanvas
npm install
npm run dev
\`\`\`

Open `localhost:5173` and allow camera access when prompted.

## License

MIT