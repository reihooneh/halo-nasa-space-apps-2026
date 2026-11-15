// Interactive 3D view of an Earth→Mars transfer. Geometry uses real orbit radii (1.000 and 1.524 AU) and a
// Hohmann-style ellipse; mission timing is the scenario's 180 days, so the path is SCHEMATIC, not an ephemeris.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MISSION_DAYS, SPE_DAY } from '../sim/mission'

const AU = 3 // scene units per AU
const R_E = 1.0, R_M = 1.524
const A = (R_E + R_M) / 2, ECC = (R_M - R_E) / (R_M + R_E)

/** Position on the transfer ellipse for mission fraction f ∈ [0,1] (Kepler's equation, so speed varies like a real orbit). */
export function transferPos(f: number): { x: number; z: number; r: number } {
  const M = Math.PI * Math.max(0, Math.min(1, f))
  let E = M
  for (let i = 0; i < 8; i++) E -= (E - ECC * Math.sin(E) - M) / (1 - ECC * Math.cos(E))
  const nu = 2 * Math.atan2(Math.sqrt(1 + ECC) * Math.sin(E / 2), Math.sqrt(1 - ECC) * Math.cos(E / 2))
  const r = A * (1 - ECC * Math.cos(E))
  return { x: r * Math.cos(nu) * AU, z: -r * Math.sin(nu) * AU, r }
}
const planetAngle = (day: number, period: number, a0: number) => a0 + (day * 2 * Math.PI) / period
const MARS_A0 = Math.PI - (MISSION_DAYS * 2 * Math.PI) / 687 // Mars meets the craft at arrival

function hasWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export default function Orbit3D({ day, reduce, height = 340 }: { day: number; reduce: boolean; height?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ setDay: (d: number) => void } | null>(null)
  const labels = useRef<Record<string, HTMLDivElement | null>>({})
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = host.current
    if (!el) return
    if (!hasWebGL()) { setOk(false); return }
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch { setOk(false); return }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(el.clientWidth, height)
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, el.clientWidth / height, 0.1, 200)
    cam.position.set(0, 7.5, 9.5)
    const controls = new OrbitControls(cam, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 5; controls.maxDistance = 22
    controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.35

    // Stars (seeded so the sky is stable)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const sg = new THREE.BufferGeometry(); const sp: number[] = []
    for (let i = 0; i < 900; i++) { const t = rnd() * Math.PI * 2, p = Math.acos(2 * rnd() - 1), r = 60 + rnd() * 30; sp.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)) }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xa9b6cc, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.7 })))

    scene.add(new THREE.AmbientLight(0x6b7a99, 0.55))
    const sunLight = new THREE.PointLight(0xfff1c1, 60, 0, 1.6); scene.add(sunLight)
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a }))
    scene.add(sun)
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,120,0.9)'); gr.addColorStop(0.35, 'rgba(255,170,60,0.35)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c) })()
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(2.6, 2.6, 1); scene.add(glow)

    const ring = (r: number, color: number, op: number) => {
      const pts = Array.from({ length: 181 }, (_, i) => new THREE.Vector3(Math.cos((i / 180) * Math.PI * 2) * r * AU, 0, -Math.sin((i / 180) * Math.PI * 2) * r * AU))
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }))
    }
    scene.add(ring(R_E, 0x60a5fa, 0.35), ring(R_M, 0xf97316, 0.35))
    const tPts = Array.from({ length: 121 }, (_, i) => { const p = transferPos(i / 120); return new THREE.Vector3(p.x, 0, p.z) })
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tPts), new THREE.LineDashedMaterial({ color: 0x2dd4bf, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.8 }))
    path.computeLineDistances(); scene.add(path)
    const done = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x5eead4, linewidth: 2 }))
    scene.add(done)

    const planet = (r: number, color: number, emissive: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 40, 40), new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.25, roughness: 0.8 }))
    const earth = planet(0.2, 0x3b82f6, 0x0b3a7a); const mars = planet(0.15, 0xef6c3a, 0x5a1d0a)
    scene.add(earth, mars)
    const craft = new THREE.Group()
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 16), new THREE.MeshStandardMaterial({ color: 0xe6edf7, emissive: 0x2dd4bf, emissiveIntensity: 0.6 }))
    body.rotation.z = -Math.PI / 2; craft.add(body)
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.85 }))
    halo.rotation.x = Math.PI / 2; craft.add(halo); scene.add(craft)

    // Solar storm shell (only around the scenario's real 20 May 2024 event)
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, wireframe: true }))
    scene.add(shell)

    let curDay = day, t0 = performance.now()
    const place = (d: number) => {
      curDay = d
      const ea = planetAngle(d, 365.25, 0), ma = planetAngle(d, 687, MARS_A0)
      earth.position.set(Math.cos(ea) * R_E * AU, 0, -Math.sin(ea) * R_E * AU)
      mars.position.set(Math.cos(ma) * R_M * AU, 0, -Math.sin(ma) * R_M * AU)
      const f = d / MISSION_DAYS, p = transferPos(f), q = transferPos(Math.min(1, f + 0.01))
      craft.position.set(p.x, 0.02, p.z); craft.lookAt(q.x, 0.02, q.z); craft.rotateY(-Math.PI / 2)
      const n = Math.max(2, Math.round(f * 120))
      done.geometry.dispose(); done.geometry = new THREE.BufferGeometry().setFromPoints(tPts.slice(0, n))
      t0 = performance.now()
    }
    place(day)
    api.current = { setDay: place }

    const v = new THREE.Vector3()
    let raf = 0
    const tick = () => {
      controls.update()
      const storm = curDay - SPE_DAY
      if (storm >= -1 && storm <= 3) {
        const k = ((performance.now() - t0) / 1600) % 1, rr = 0.5 + k * (transferPos(curDay / MISSION_DAYS).r * AU + 0.6)
        shell.scale.setScalar(rr); (shell.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k)
      } else (shell.material as THREE.MeshBasicMaterial).opacity = 0
      halo.rotation.z += reduce ? 0 : 0.02
      renderer.render(scene, cam)
      const w = el.clientWidth
      for (const [key, obj] of [['sun', sun], ['earth', earth], ['mars', mars], ['craft', craft]] as const) {
        const lab = labels.current[key]; if (!lab) continue
        v.copy(obj.position).project(cam)
        lab.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * height}px)`
        lab.style.opacity = v.z < 1 ? '1' : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, height); cam.aspect = el.clientWidth / height; cam.updateProjectionMatrix() })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose()
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.() })
      glowTex.dispose(); renderer.dispose(); renderer.domElement.remove(); api.current = null
    }
  }, [height, reduce])

  useEffect(() => { api.current?.setDay(day) }, [day])

  const pct = Math.round((day / MISSION_DAYS) * 100)
  const r = transferPos(day / MISSION_DAYS).r
  if (!ok) return (
    <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-space-950/60 text-sm text-ink-mute" style={{ height }} data-orbit-fallback>
      3D view needs WebGL. At day {day} the crew is {pct}% of the way to Mars, {r.toFixed(2)} AU from the Sun.
    </div>
  )
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_center,rgba(30,41,70,0.6),rgba(7,11,22,0.9))]" style={{ height }} data-orbit3d
      role="img" aria-label={`3D view of the Earth to Mars transfer. Day ${day}: the crew is ${pct}% of the way, ${r.toFixed(2)} AU from the Sun. Drag to rotate, scroll to zoom.`}>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      {([['sun', 'Sun', 'text-amber-300'], ['earth', 'Earth', 'text-sky-300'], ['mars', 'Mars', 'text-orange-300'], ['craft', 'Crew · D' + day, 'text-teal']] as const).map(([k, t, c]) => (
        <div key={k} ref={(n) => { labels.current[k] = n }} className={`pointer-events-none absolute left-0 top-0 -translate-y-6 whitespace-nowrap text-[10.5px] font-semibold ${c}`} style={{ willChange: 'transform' }} aria-hidden>
          <span className="-ml-[50%] inline-block rounded-md bg-space-950/70 px-1.5 py-0.5 backdrop-blur">{t}</span>
        </div>
      ))}
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-ink-mute">
        <span>Orbits to scale (1.00 and 1.52 AU) · transfer timing schematic · drag to rotate</span>
        <span className="num text-ink-soft">{pct}% · {r.toFixed(2)} AU from Sun{Math.abs(day - SPE_DAY) <= 3 ? ' · storm passing' : ''}</span>
      </div>
    </div>
  )
}
