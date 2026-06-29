import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ── The five orbiting "drawn" loops — same dual-palette logic as the rest of
//    the app: cool tones (indigo/violet/cyan) + warm tones (pink/amber).
//    Each loop is a closed 3D path that an invisible "hand" traces forever,
//    leaving a fading glow trail behind it — the literal idea of Air Canvas,
//    staged in three dimensions.
const STROKE_DEFS = [
  { color: [129, 140, 248], speed: 0.050, offset: 0.00, trail: 0.26, points: [
    [-5.0, 2.2, -2.0], [-2.5, 3.4, 0.5], [0.0, 1.8, 2.8], [2.6, -0.6, 1.4], [1.2, -2.8, -1.6], [-3.0, -1.4, -2.4],
  ]},
  { color: [167, 139, 250], speed: 0.040, offset: 0.20, trail: 0.28, points: [
    [4.6, 2.6, -1.2], [3.0, 4.0, 1.6], [1.4, 2.2, 3.0], [2.2, -1.6, 2.2], [4.4, -3.0, 0.0], [5.2, 0.0, -2.0],
  ]},
  { color: [34, 211, 238], speed: 0.065, offset: 0.45, trail: 0.30, points: [
    [-1.0, 4.2, 0.5], [1.6, 4.6, -0.8], [2.4, 3.0, 0.4], [0.4, 2.6, 1.6], [-1.8, 3.0, 1.0],
  ]},
  { color: [244, 114, 182], speed: 0.045, offset: 0.65, trail: 0.24, points: [
    [-4.0, -3.4, 1.0], [-1.4, -4.4, -0.6], [1.8, -4.0, 1.4], [3.6, -2.6, -1.0], [1.0, -1.6, 2.4], [-2.6, -2.2, 1.6],
  ]},
  { color: [251, 191, 36], speed: 0.072, offset: 0.85, trail: 0.22, points: [
    [-2.2, 0.6, 3.4], [0.0, 1.6, 4.0], [2.0, 0.4, 3.6], [1.0, -1.2, 3.8], [-1.4, -0.6, 3.2],
  ]},
]

const TRAIL_SEGMENTS = 46

function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0,    'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export default function Scene3D({ reducedMotion = false, onUnsupported }) {
  const containerRef = useRef(null)
  const onUnsupportedRef = useRef(onUnsupported)

  useEffect(() => {
    onUnsupportedRef.current = onUnsupported
  }, [onUnsupported])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const motionScale = reducedMotion ? 0.15 : 1
    const canHover = typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches

    let renderer, composer, scene, camera, glowTexture
    let rafId = null
    let mouseX = 0, mouseY = 0
    let camX = 0, camY = 0.4
    const clock = new THREE.Clock()
    const strokes = []

    function handlePointerMove(e) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = (e.clientY / window.innerHeight) * 2 - 1
    }

    function onResize() {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
    }

    try {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight

      scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x030305, 0.082)

      camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
      camera.position.set(0, 0.4, 9)

      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
      if (!renderer.getContext()) throw new Error('WebGL context unavailable')
      renderer.setClearColor(0x030305, 1)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setSize(w, h)
      container.appendChild(renderer.domElement)

      composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.55, 0.16)
      composer.addPass(bloomPass)

      glowTexture = createGlowTexture()

      // Shift the entire composition right-of-center so it sits behind the
      // new asymmetric HUD layout rather than dead-center behind a hero stack.
      const worldGroup = new THREE.Group()
      worldGroup.position.set(1.6, 0.2, 0)
      scene.add(worldGroup)

      // ── Central "ink core" — the glowing source every stroke orbits ──────
      const coreGroup = new THREE.Group()

      const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color: 0x8b5cf6, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))
      coreHalo.scale.set(5.2, 5.2, 1)

      const coreGlow = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.82, 2),
        new THREE.MeshBasicMaterial({
          color: 0x9089fa, transparent: true, opacity: 0.85,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      )

      const coreShell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.32, 1),
        new THREE.MeshBasicMaterial({
          color: 0xc4b5fd, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false,
        })
      )

      coreGroup.add(coreHalo, coreGlow, coreShell)
      worldGroup.add(coreGroup)

      // ── Grid horizon — gives the void an unmistakable sense of 3D depth ──
      const grid = new THREE.GridHelper(34, 28, 0x6366f1, 0x312e5e)
      grid.position.y = -3.4
      grid.material.transparent = true
      grid.material.opacity = 0.15
      grid.material.depthWrite = false
      worldGroup.add(grid)

      // ── Ambient drifting light-dust ───────────────────────────────────────
      const PARTICLE_COUNT = 260
      const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlePositions[i * 3]     = (Math.random() - 0.5) * 16
        particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 9
        particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1
      }
      const particleGeo = new THREE.BufferGeometry()
      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
      const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
        size: 0.07, map: glowTexture, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, color: 0xc7d2fe, sizeAttenuation: true,
      }))
      scene.add(particles)

      // ── The five self-drawing orbiting strokes ────────────────────────────
      STROKE_DEFS.forEach(def => {
        const curve = new THREE.CatmullRomCurve3(
          def.points.map(p => new THREE.Vector3(p[0], p[1], p[2])),
          true, 'catmullrom', 0.5
        )

        const positions = new Float32Array(TRAIL_SEGMENTS * 3)
        const colors    = new Float32Array(TRAIL_SEGMENTS * 3)
        const geometry   = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
        geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage))

        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
          vertexColors: true, transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }))
        worldGroup.add(line)

        const tip = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture,
          color: new THREE.Color(def.color[0] / 255, def.color[1] / 255, def.color[2] / 255),
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        }))
        tip.scale.set(0.6, 0.6, 1)
        worldGroup.add(tip)

        strokes.push({
          curve, geometry, tip, color: def.color,
          speed: def.speed, progress: def.offset, trailLen: def.trail,
        })
      })

      if (canHover) window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('resize', onResize)

      // ── Render loop ────────────────────────────────────────────────────────
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        const delta = Math.min(clock.getDelta(), 0.05)
        const t = clock.getElapsedTime()

        coreGroup.rotation.y += delta * 0.16 * motionScale
        coreShell.rotation.x += delta * 0.10 * motionScale
        const pulse = 1 + Math.sin(t * 1.4) * 0.05 * motionScale
        coreGlow.scale.setScalar(pulse)

        particles.rotation.y += delta * 0.012 * motionScale

        strokes.forEach(s => {
          s.progress = (s.progress + s.speed * delta * motionScale) % 1
          const posAttr = s.geometry.attributes.position
          const colAttr = s.geometry.attributes.color
          const [cr, cg, cb] = s.color

          for (let i = 0; i < TRAIL_SEGMENTS; i++) {
            let pt = s.progress - s.trailLen + (i / (TRAIL_SEGMENTS - 1)) * s.trailLen
            pt = ((pt % 1) + 1) % 1
            const p = s.curve.getPointAt(pt)
            posAttr.setXYZ(i, p.x, p.y, p.z)
            const fade = Math.pow(i / (TRAIL_SEGMENTS - 1), 1.6)
            colAttr.setXYZ(i, (cr / 255) * fade, (cg / 255) * fade, (cb / 255) * fade)
          }
          posAttr.needsUpdate = true
          colAttr.needsUpdate = true

          const tipPoint = s.curve.getPointAt(s.progress)
          s.tip.position.copy(tipPoint)
          const tipPulse = 0.55 + Math.sin(t * 4 + s.progress * 10) * 0.12
          s.tip.scale.set(tipPulse, tipPulse, 1)
        })

        // Slow cinematic auto-orbit, nudged further by cursor parallax
        const autoX = Math.sin(t * 0.05) * 0.6 * motionScale
        const targetX = autoX + mouseX * 1.1 * motionScale
        const targetY = 0.4 - mouseY * 0.6 * motionScale
        camX += (targetX - camX) * 0.04
        camY += (targetY - camY) * 0.04
        camera.position.x = camX
        camera.position.y = camY
        camera.lookAt(0.8, 0.2, 0)

        composer.render()
      }
      animate()
    } catch (err) {
      console.warn('Scene3D: WebGL unavailable, falling back to 2D background.', err)
      if (typeof onUnsupportedRef.current === 'function') onUnsupportedRef.current()
      return undefined
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      if (canHover) window.removeEventListener('pointermove', handlePointerMove)

      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach(m => m.dispose())
        }
      })

      if (glowTexture) glowTexture.dispose()
      composer.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [reducedMotion])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  )
}