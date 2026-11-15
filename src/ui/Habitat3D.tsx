// 3D cutaway of an ILLUSTRATIVE transit habitat (not a real vehicle): four work areas and a water-walled storm shelter.
// Crew markers move into the shelter as the checklist progresses; particles show the storm being absorbed by the wall.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { disposeScene, fresnelMaterial, makeRenderer } from './three-kit'

const ROOMS: { name: string; x0: number; x1: number; color: number }[] = [
  { name: 'Galley', x0: -3.0, x1: -1.9, color: 0x60a5fa },
  { name: 'Exercise', x0: -1.9, x1: -0.8, color: 0xa78bfa },
  { name: 'Lab', x0: -0.8, x1: 0.3, color: 0xfbbf24 },
  { name: 'Crew quarters', x0: 0.3, x1: 1.4, color: 0x94a3b8 },
  { name: 'Storm shelter', x0: 1.4, x1: 3.0, color: 0x2dd4bf },
]
const HOME: [number, number][] = [[-2.45, 0.3], [-1.35, -0.3], [-0.25, 0.25], [0.85, -0.2]]
const SAFE: [number, number][] = [[1.85, 0.22], [2.2, -0.22], [2.55, 0.22], [1.95, -0.2]]
const CREW_COL = [0x2dd4bf, 0x60a5fa, 0xf472b6, 0xfbbf24]
const RAD = 1.15

export default function Habitat3D({ storm, inShelter, reduce, height = 330 }: { storm: boolean; inShelter: number; reduce: boolean; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const live = useRef({ storm, inShelter }); live.current = { storm, inShelter }
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = makeRenderer(el, height)
    if (!renderer) { setOk(false); return }
    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(34, el.clientWidth / height, 0.1, 80)
    cam.position.set(0.9, 3.7, 6.3)
    const controls = new OrbitControls(cam, renderer.domElement)
    controls.target.set(0, -0.1, 0); controls.enablePan = false; controls.enableDamping = true; controls.minDistance = 5; controls.maxDistance = 13
    controls.maxPolarAngle = Math.PI / 2.05
    scene.add(new THREE.AmbientLight(0x9fb3d9, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 6, 4); scene.add(key)

    // hull: lower half-cylinder (cutaway) + rim + end caps
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1b2742, metalness: 0.5, roughness: 0.55, side: THREE.DoubleSide })
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 6, 48, 1, true, Math.PI / 2, Math.PI), hullMat); hull.rotation.z = Math.PI / 2; scene.add(hull)
    const ghost = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 6, 48, 1, true, -Math.PI / 2, Math.PI), fresnelMaterial(0x7dd3fc, 1.6, 0.35, 0.01)); ghost.rotation.z = Math.PI / 2; scene.add(ghost)
    for (const x of [-3, 3]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(RAD, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), fresnelMaterial(0x7dd3fc, 1.4, 0.4, 0.03)); cap.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2; cap.scale.y = 0.45; cap.position.x = x; scene.add(cap) }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.04, RAD * 1.72), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.9 })); floor.position.y = -0.5; scene.add(floor)
    // rooms: coloured floor tiles, bulkheads, simple furniture
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, op = 1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7, transparent: op < 1, opacity: op })); m.position.set(x, y, z); scene.add(m); return m }
    for (const r of ROOMS) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0 - 0.06, 0.02, RAD * 1.6), new THREE.MeshStandardMaterial({ color: r.color, transparent: true, opacity: 0.16, emissive: r.color, emissiveIntensity: 0.25 }))
      tile.position.set((r.x0 + r.x1) / 2, -0.46, 0); scene.add(tile)
      if (r.x0 > -3) { const wall = new THREE.Mesh(new THREE.CircleGeometry(RAD * 0.98, 40, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); wall.rotation.y = Math.PI / 2; wall.position.x = r.x0; scene.add(wall) }
    }
    box(0.7, 0.3, 0.3, -2.45, -0.3, -0.6, 0x475569); box(0.5, 0.05, 0.5, -2.45, -0.2, 0.5, 0x64748b)           // galley counter + table
    box(0.7, 0.08, 0.3, -1.35, -0.4, 0.45, 0x6d28d9); const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0xa78bfa })); wheel.position.set(-1.35, -0.2, -0.55); scene.add(wheel) // treadmill + cycle
    box(0.8, 0.35, 0.25, -0.25, -0.28, -0.65, 0x92400e); box(0.3, 0.25, 0.3, -0.5, -0.33, 0.55, 0xb45309)          // lab racks
    for (const z of [-0.55, 0.55]) box(0.8, 0.22, 0.32, 0.85, -0.36, z, 0x475569)                                   // bunks
    // storm shelter: thick water wall (blue), stowage bags
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 1.5, 40, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, emissive: 0x0ea5e9, emissiveIntensity: 0.55, side: THREE.DoubleSide }))
    water.rotation.z = Math.PI / 2; water.position.x = 2.2; scene.add(water)
    const waterTop = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.5, 40, 1, true, -Math.PI / 2, Math.PI), fresnelMaterial(0x38bdf8, 1.2, 0.75, 0.1)); waterTop.rotation.z = Math.PI / 2; waterTop.position.x = 2.2; scene.add(waterTop)
    for (const [x, z] of [[1.55, -0.6], [1.55, 0.6], [2.85, -0.6], [2.85, 0.6], [2.2, -0.75], [2.2, 0.75]]) box(0.22, 0.3, 0.22, x, -0.3, z, 0x0f766e)
    // crew markers
    const crew = CREW_COL.map((c, i) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 6, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55 })); m.position.set(HOME[i][0], -0.25, HOME[i][1]); scene.add(m); return m })
    // route arrows on the floor
    const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.45, -0.43, 0), new THREE.Vector3(1.5, -0.43, 0)]), new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.14, gapSize: 0.1 })); route.computeLineDistances(); scene.add(route)
    // radiation particles: streaks crossing the hull, absorbed by the shelter's water wall
    const NP = 420, pos = new Float32Array(NP * 3), seedv = new Float32Array(NP * 3)
    let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < NP; i++) { seedv[i * 3] = rnd() * 7 - 3.5; seedv[i * 3 + 1] = rnd(); seedv[i * 3 + 2] = rnd() * 2.6 - 1.3 }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xfb7185, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(pts)

    const clock = new THREE.Clock(), v = new THREE.Vector3()
    let raf = 0
    const tick = () => {
      const t = clock.getElapsedTime(), { storm: st, inShelter: n } = live.current
      controls.update()
      crew.forEach((m, i) => { const tgt = i < n ? SAFE[i] : HOME[i]; m.position.x += (tgt[0] - m.position.x) * (reduce ? 1 : 0.05); m.position.z += (tgt[1] - m.position.z) * (reduce ? 1 : 0.05); m.position.y = -0.25 + (reduce ? 0 : 0.03 * Math.sin(t * 2 + i)) })
      const shown = st ? NP : 50
      for (let i = 0; i < NP; i++) {
        const x = seedv[i * 3], z = seedv[i * 3 + 2]
        let y = 2.2 - (((reduce ? 0.4 : t * (st ? 0.55 : 0.2)) + seedv[i * 3 + 1]) % 1) * 3.4
        const overShelter = x > 1.45 && x < 2.95 && Math.abs(z) < 0.98
        if (i >= shown || (overShelter && y < Math.sqrt(Math.max(0, 1 - z * z)) * 1.0)) y = 99 // absorbed by the water wall
        pos[i * 3] = x + (2.2 - y) * 0.18; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
      }
      pGeo.attributes.position.needsUpdate = true
      ;(water.material as THREE.MeshStandardMaterial).emissiveIntensity = st && !reduce ? 0.6 + 0.3 * Math.sin(t * 4) : 0.5
      renderer.render(scene, cam)
      const w = el.clientWidth
      ROOMS.forEach((r, i) => { const lab = labels.current[i]; if (!lab) return; v.set((r.x0 + r.x1) / 2, i === 4 ? 1.25 : 0.55, 0).project(cam); const hw = lab.offsetWidth / 2 + 6, hh = lab.offsetHeight / 2 + 4; const x = Math.max(hw, Math.min(w - hw, ((v.x + 1) / 2) * w)), y = Math.max(hh + 34, Math.min(height - hh - 26, ((1 - v.y) / 2) * height)); lab.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)` })
      raf = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, height); cam.aspect = el.clientWidth / height; cam.updateProjectionMatrix() })
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); disposeScene(scene); renderer.dispose(); renderer.domElement.remove() }
  }, [height, reduce])

  if (!ok) return <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] p-6 text-center text-sm text-ink-mute" style={{ height }} data-habitat-fallback>3D view needs WebGL. Route: every area leads along the central corridor to the water-walled storm shelter at the end of the habitat.</div>
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_center,rgba(26,38,66,0.6),rgba(5,8,18,0.95))]" style={{ height }} data-habitat3d>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={`3D cutaway of an illustrative habitat. ${inShelter} of 4 crew are in the water-walled storm shelter. ${storm ? 'Storm particles are being absorbed by the shelter wall.' : ''}`} />
      {ROOMS.map((r, i) => <div key={r.name} ref={(n) => { labels.current[i] = n }} className={`pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium backdrop-blur ${i === 4 ? 'border-teal/50 bg-teal/15 text-teal' : 'border-white/10 bg-space-950/70 text-ink-soft'}`} aria-hidden>{r.name}</div>)}
      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-space-950/75 px-2 py-1 text-[11px] text-ink-soft" data-in-shelter><b className="num text-teal">{inShelter}/4</b> crew in shelter</div>
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-wrap justify-between gap-2 text-[10.5px] text-ink-mute"><span>Illustrative layout, not a real vehicle · drag to rotate</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400 align-middle" />water wall <i className="ml-2 mr-1 inline-block h-2 w-2 rounded-full bg-rose-400 align-middle" />storm particles</span></div>
    </div>
  )
}
