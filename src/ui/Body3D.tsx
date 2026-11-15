// 3D "hologram" body map built entirely from primitives (no model files). Each of the seven body systems is a group of
// glowing shapes coloured by its current state; HTML buttons are projected onto the figure so every system is
// reachable by mouse, touch and keyboard. Anatomy is stylised, not to scale.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SystemId } from '../data/domain'
import { disposeScene, fresnelMaterial, glowTexture, limb, makeRenderer } from './three-kit'

export interface BodySystemView { id: SystemId; name: string; color: string; label: string; dim: boolean }
const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)
/** Where each label sits (pushed outward so labels do not overlap from the front). */
const ANCHOR: Record<SystemId, THREE.Vector3> = {
  sleep: V(0.62, 3.52, 0), brain: V(-0.62, 3.3, 0), eyes: V(0.7, 3.0, 0.2), sensorimotor: V(-0.72, 2.86, 0),
  cardio: V(0.95, 2.36, 0.15), immune: V(-0.98, 2.05, 0), msk: V(0.78, 0.62, 0),
}
const ORGAN: Record<SystemId, THREE.Vector3> = {
  sleep: V(0, 3.42, 0), brain: V(0, 3.1, 0), eyes: V(0.09, 3.02, 0.2), sensorimotor: V(-0.22, 2.98, 0),
  cardio: V(0.08, 2.36, 0.1), immune: V(-0.42, 2.3, 0.05), msk: V(0.24, 0.9, 0),
}

export default function Body3D({ systems, sel, onSelect, hr, reduce, height = 560 }: { systems: BodySystemView[]; sel: SystemId; onSelect: (s: SystemId) => void; hr: number | null; reduce: boolean; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<Partial<Record<SystemId, HTMLButtonElement | null>>>({})
  const lines = useRef<Partial<Record<SystemId, SVGLineElement | null>>>({})
  const live = useRef({ systems, sel, hr })
  live.current = { systems, sel, hr }
  const api = useRef<{ refresh: () => void } | null>(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = makeRenderer(el, height)
    if (!renderer) { setOk(false); return }
    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(30, el.clientWidth / height, 0.1, 60)
    cam.position.set(0, 1.9, 8.6)
    const controls = new OrbitControls(cam, renderer.domElement)
    controls.target.set(0, 1.72, 0); controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true
    controls.minPolarAngle = Math.PI / 2.25; controls.maxPolarAngle = Math.PI / 1.85
    controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.9

    /* ---- translucent body shell ---- */
    const skin = fresnelMaterial(0x7dd3fc, 2.1, 0.55, 0.035)
    const body = new THREE.Group()
    const blob = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 28), skin); m.position.set(x, y, z); m.scale.set(sx, sy, sz); body.add(m) }
    blob(0, 3.1, 0, 0.27, 0.33, 0.29)            // head
    blob(0, 2.4, 0, 0.5, 0.42, 0.27)             // chest
    blob(0, 1.9, 0, 0.4, 0.4, 0.24)              // abdomen
    blob(0, 1.5, 0, 0.45, 0.3, 0.26)             // pelvis
    body.add(limb(V(0, 2.74, 0), V(0, 2.9, 0), 0.1, skin))
    for (const s of [-1, 1]) {
      blob(s * 0.56, 2.66, 0, 0.16, 0.15, 0.15)
      body.add(limb(V(s * 0.62, 2.58, 0), V(s * 0.74, 2.0, 0), 0.105, skin), limb(V(s * 0.75, 1.93, 0), V(s * 0.84, 1.36, 0.06), 0.085, skin))
      blob(s * 0.86, 1.2, 0.08, 0.085, 0.13, 0.06)
      body.add(limb(V(s * 0.23, 1.36, 0), V(s * 0.25, 0.72, 0), 0.155, skin), limb(V(s * 0.25, 0.6, 0), V(s * 0.25, 0.02, 0), 0.11, skin))
      blob(s * 0.25, -0.12, 0.1, 0.1, 0.07, 0.2)
    }
    scene.add(body)

    /* ---- systems ---- */
    const groups = {} as Record<SystemId, THREE.Group>
    const mats = {} as Record<SystemId, THREE.MeshBasicMaterial>
    const mk = (id: SystemId) => { const g = new THREE.Group(); groups[id] = g; mats[id] = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }); scene.add(g); return { g, m: mats[id] } }
    const tube = (pts: THREE.Vector3[], r: number, m: THREE.Material) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 8, r, 6, false), m)

    { // brain: two hemispheres with folds
      const { g, m } = mk('brain')
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), m); h.position.set(s * 0.06, 3.16, 0); h.scale.set(0.95, 0.95, 1.35); g.add(h) }
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.012, 0.006, 6, 24, Math.PI), m); f.position.set(0, 3.15, -0.1 + i * 0.05); f.rotation.y = Math.PI / 2; g.add(f) }
      const stem = limb(V(0, 3.05, -0.02), V(0, 2.92, -0.03), 0.03, m); g.add(stem)
    }
    { // eyes
      const { g, m } = mk('eyes')
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), m); e.position.set(s * 0.095, 3.02, 0.21); g.add(e)
        g.add(tube([V(s * 0.095, 3.02, 0.17), V(s * 0.05, 3.03, 0.05), V(0, 3.06, -0.08)], 0.008, m)) // optic nerve
      }
    }
    { // balance & coordination: inner ears + spinal cord + main nerves
      const { g, m } = mk('sensorimotor')
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 20), m); c.position.set(s * 0.21, 2.99, -0.02); c.rotation.set(k === 0 ? Math.PI / 2 : 0, k === 1 ? Math.PI / 2 : 0, k * 0.6); g.add(c) }
      g.add(tube([V(0, 2.92, -0.06), V(0, 2.5, -0.13), V(0, 2.0, -0.1), V(0, 1.5, -0.12)], 0.014, m))
      for (const s of [-1, 1]) g.add(tube([V(0, 2.62, -0.1), V(s * 0.4, 2.6, -0.02), V(s * 0.7, 2.0, 0), V(s * 0.83, 1.3, 0.06)], 0.006, m), tube([V(0, 1.52, -0.1), V(s * 0.2, 1.3, 0), V(s * 0.25, 0.6, 0.02), V(s * 0.25, 0, 0.04)], 0.006, m))
    }
    { // sleep & body clock: orbiting ring + crescent
      const { g, m } = mk('sleep')
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.009, 8, 64), m); r1.position.y = 3.14; r1.rotation.x = Math.PI / 2.3; r1.name = 'ring'; g.add(r1)
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), m); moon.name = 'moon'; g.add(moon)
      const pineal = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), m); pineal.position.set(0, 3.08, -0.03); g.add(pineal)
    }
    { // heart & vessels
      const { g, m } = mk('cardio')
      const heart = new THREE.Group(); heart.name = 'heart'; heart.position.set(0.07, 2.38, 0.1)
      for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 16), m); l.position.set(s * 0.045, 0.03, 0); heart.add(l) }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.17, 18), m); tip.rotation.x = Math.PI; tip.position.y = -0.07; heart.add(tip)
      g.add(heart)
      g.add(tube([V(0.05, 2.46, 0.08), V(0.0, 2.62, 0.04), V(-0.03, 2.5, -0.04), V(-0.02, 1.9, -0.04), V(0, 1.5, -0.03)], 0.02, m)) // aorta
      g.add(tube([V(0.02, 2.6, 0.04), V(0.03, 2.85, 0.03), V(0.06, 3.02, 0.02)], 0.011, m), tube([V(-0.02, 2.6, 0.04), V(-0.04, 2.85, 0.03), V(-0.07, 3.02, 0.02)], 0.011, m))
      for (const s of [-1, 1]) g.add(tube([V(0, 2.6, 0.02), V(s * 0.45, 2.62, 0.02), V(s * 0.7, 2.05, 0.03), V(s * 0.82, 1.4, 0.08)], 0.011, m), tube([V(0, 1.5, -0.03), V(s * 0.18, 1.34, 0.02), V(s * 0.24, 0.65, 0.04), V(s * 0.25, 0.04, 0.05)], 0.013, m))
    }
    { // immune: lymph nodes, thymus, spleen
      const { g, m } = mk('immune')
      const nodes: [number, number, number, number][] = [[0.1, 2.84, 0.04, 0.03], [-0.1, 2.84, 0.04, 0.03], [0.5, 2.5, 0.02, 0.04], [-0.5, 2.5, 0.02, 0.04], [0.2, 1.4, 0.08, 0.04], [-0.2, 1.4, 0.08, 0.04], [0, 2.56, 0.12, 0.05], [-0.26, 2.08, 0.04, 0.075], [0.26, 0.66, 0.06, 0.028], [-0.26, 0.66, 0.06, 0.028]]
      for (const [x, y, z, r] of nodes) { const n = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), m); n.position.set(x, y, z); g.add(n) }
      for (const s of [-1, 1]) g.add(tube([V(s * 0.1, 2.84, 0.04), V(s * 0.3, 2.66, 0.04), V(s * 0.5, 2.5, 0.02), V(s * 0.36, 1.9, 0.06), V(s * 0.2, 1.4, 0.08), V(s * 0.26, 0.66, 0.06)], 0.005, m))
    }
    { // bones & muscles: spine, ribs, pelvis, long bones
      const { g, m } = mk('msk')
      for (let i = 0; i < 14; i++) { const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), m); vb.position.set(0, 1.55 + i * 0.095, -0.14 + Math.sin(i / 4.5) * 0.03); g.add(vb) }
      for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.3 - Math.abs(i - 1.5) * 0.03, 0.011, 6, 32, Math.PI * 1.55), m); rib.position.set(0, 2.62 - i * 0.1, -0.02); rib.rotation.set(Math.PI / 2, 0, Math.PI * 0.725 + Math.PI / 2); rib.scale.set(1, 0.62, 1); g.add(rib) }
      const pel = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 32), m); pel.position.set(0, 1.46, 0); pel.rotation.x = Math.PI / 2.2; pel.scale.set(1, 0.6, 1); g.add(pel)
      const bone = (a: THREE.Vector3, b: THREE.Vector3, r: number) => { g.add(limb(a, b, r, m)); for (const p of [a, b]) { const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.9, 10, 10), m); k.position.copy(p); g.add(k) } }
      for (const s of [-1, 1]) { bone(V(s * 0.22, 1.38, 0), V(s * 0.25, 0.7, 0), 0.03); bone(V(s * 0.25, 0.6, 0), V(s * 0.25, 0.02, 0), 0.024); bone(V(s * 0.6, 2.6, 0), V(s * 0.74, 2.0, 0), 0.022); bone(V(s * 0.75, 1.93, 0), V(s * 0.84, 1.36, 0.06), 0.018) }
      g.add(limb(V(-0.5, 2.7, 0.06), V(0.5, 2.7, 0.06), 0.014, m))
    }

    /* ---- stage: platform rings, scan plane, selection glow ---- */
    const ringM = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    for (const [r0, r1, op] of [[0.95, 1.0, 0.6], [1.25, 1.27, 0.3], [0.2, 0.75, 0.07]] as const) { const d = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72), ringM.clone()); (d.material as THREE.MeshBasicMaterial).opacity = op; d.rotation.x = -Math.PI / 2; d.position.y = -0.2; scene.add(d) }
    const ticks = new THREE.Group()
    for (let i = 0; i < 36; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, i % 3 ? 0.05 : 0.1), ringM); const a = (i / 36) * Math.PI * 2; t.position.set(Math.cos(a) * 1.12, -0.2, Math.sin(a) * 1.12); t.rotation.y = -a + Math.PI / 2; ticks.add(t) }
    scene.add(ticks)
    const scan = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.9, 64), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
    scan.rotation.x = -Math.PI / 2; scene.add(scan)
    const selGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,0.75)', 'rgba(255,255,255,0.16)'), depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(selGlow)

    const refresh = () => {
      const { systems: ss, sel: cur } = live.current
      for (const s of ss) {
        const m = mats[s.id]; if (!m) continue
        m.color.set(s.color)
        m.opacity = s.dim ? 0.08 : s.id === cur ? 1 : 0.42
      }
      const c = ss.find((s) => s.id === cur)
      selGlow.position.copy(ORGAN[cur]); (selGlow.material as THREE.SpriteMaterial).color.set(c?.color ?? '#2DD4BF')
    }
    refresh(); api.current = { refresh }

    const clock = new THREE.Clock(), v = new THREE.Vector3(), v2 = new THREE.Vector3()
    const heart = groups.cardio.getObjectByName('heart')!, sRing = groups.sleep.getObjectByName('ring')!, sMoon = groups.sleep.getObjectByName('moon')!
    let raf = 0
    const tick = () => {
      const t = clock.getElapsedTime()
      controls.update()
      const bpm = live.current.hr ?? 60
      const ph = (t * bpm / 60) % 1
      const beat = reduce ? 1 : 1 + 0.16 * Math.exp(-ph * 9) + 0.07 * Math.exp(-Math.abs(ph - 0.28) * 22)
      heart.scale.setScalar(beat)
      if (!reduce) { sRing.rotation.z = t * 0.5; ticks.rotation.y = t * 0.1; scan.position.y = -0.1 + ((t * 0.45) % 1) * 3.7 }
      else scan.position.y = 1.7
      sMoon.position.set(Math.cos(t * 0.5) * 0.4, 3.14 + Math.sin(t * 0.5) * 0.16, Math.sin(t * 0.5) * 0.36)
      const pulse = reduce ? 0.85 : 0.75 + 0.2 * Math.sin(t * 3)
      selGlow.scale.setScalar(live.current.sel === 'msk' ? 1.5 * pulse : 0.85 * pulse)
      renderer.render(scene, cam)
      const w = el.clientWidth
      for (const id of Object.keys(ANCHOR) as SystemId[]) {
        const b = labels.current[id], ln = lines.current[id]
        v.copy(ANCHOR[id]).project(cam); v2.copy(ORGAN[id]).project(cam)
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * height, x2 = ((v2.x + 1) / 2) * w, y2 = ((1 - v2.y) / 2) * height
        if (b) { const hw = b.offsetWidth / 2 + 4; b.style.transform = `translate(${Math.max(hw, Math.min(w - hw, x))}px, ${Math.max(14, Math.min(height - 30, y))}px) translate(-50%, -50%)` }
        if (ln) { ln.setAttribute('x1', String(x)); ln.setAttribute('y1', String(y)); ln.setAttribute('x2', String(x2)); ln.setAttribute('y2', String(y2)) }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    // Pause the spin while the pointer or keyboard focus is on the figure, so labels hold still to be clicked.
    let dragged = false
    const wrap = el.parentElement!
    const stopSpin = () => { dragged = true; controls.autoRotate = false }
    const pause = () => { controls.autoRotate = false }
    const resume = () => { controls.autoRotate = !reduce && !dragged }
    renderer.domElement.addEventListener('pointerdown', stopSpin)
    wrap.addEventListener('pointerenter', pause); wrap.addEventListener('pointerleave', resume); wrap.addEventListener('focusin', pause); wrap.addEventListener('focusout', resume)
    const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, height); cam.aspect = el.clientWidth / height; cam.updateProjectionMatrix() })
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.domElement.removeEventListener('pointerdown', stopSpin); wrap.removeEventListener('pointerenter', pause); wrap.removeEventListener('pointerleave', resume); wrap.removeEventListener('focusin', pause); wrap.removeEventListener('focusout', resume); controls.dispose(); disposeScene(scene); renderer.dispose(); renderer.domElement.remove(); api.current = null }
  }, [height, reduce])

  useEffect(() => { api.current?.refresh() })

  if (!ok) return <div className="rounded-2xl border border-white/[0.07] p-6 text-center text-sm text-ink-mute" data-body3d-fallback>3D view needs WebGL. Switch to the 2D diagram.</div>
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_50%_35%,rgba(22,44,74,0.7),rgba(5,8,18,0.96))]" style={{ height }} data-body3d>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label="3D body figure. Drag to rotate. Use the labelled buttons to select a body system." />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {systems.map((s) => <line key={s.id} ref={(n) => { lines.current[s.id] = n }} stroke={s.color} strokeOpacity={s.dim ? 0.15 : sel === s.id ? 0.9 : 0.4} strokeWidth={sel === s.id ? 1.5 : 1} strokeDasharray={sel === s.id ? undefined : '2 3'} />)}
      </svg>
      {systems.map((s) => (
        <button key={s.id} ref={(n) => { labels.current[s.id] = n }} onClick={() => onSelect(s.id)} aria-pressed={sel === s.id} data-system3d={s.id}
          className={`focus-ring absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium backdrop-blur transition-[background-color,border-color,opacity,box-shadow] ${sel === s.id ? 'bg-space-950/90 text-ink' : 'bg-space-950/65 text-ink-soft hover:text-ink'} ${s.dim ? 'opacity-40' : ''}`}
          style={{ borderColor: s.color + (sel === s.id ? 'ee' : '66'), boxShadow: sel === s.id ? `0 0 18px -2px ${s.color}aa` : undefined, willChange: 'transform' }}>
          <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} aria-hidden /><span className="sr-only sm:not-sr-only">{s.name}</span><span className="sr-only">: {s.label}</span>
        </button>
      ))}
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex justify-between text-[10.5px] text-ink-mute"><span>Drag to rotate · pauses when you point at it · stylised anatomy</span><span className="num">{hr != null ? `heart beating at ${hr} bpm` : ''}</span></div>
    </div>
  )
}
