// Interactive 3D view of an Earth→Mars transfer. Orbit radii are real (1.000 and 1.524 AU) and the craft follows a
// Hohmann-style ellipse solved with Kepler's equation. Mission timing is the scenario's 180 days and planet/craft
// sizes are enlarged to be visible, so the picture is SCHEMATIC, not an ephemeris. All textures are generated in code.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MISSION_DAYS, SPE_DAY } from '../sim/mission'
import { disposeScene, fresnelMaterial, glowTexture, makeRenderer, planetTexture, starField } from './three-kit'

const AU = 3
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
const MARS_A0 = Math.PI - (MISSION_DAYS * 2 * Math.PI) / 687
type View = 'overview' | 'follow' | 'top'

function buildCraft(): THREE.Group {
  const g = new THREE.Group()
  const hull = new THREE.MeshStandardMaterial({ color: 0xdfe7f3, metalness: 0.55, roughness: 0.35, emissive: 0x16324a, emissiveIntensity: 0.5 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 })
  const panel = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.4, roughness: 0.3, emissive: 0x1e3a8a, emissiveIntensity: 0.7 })
  const hab = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 16), hull); hab.rotation.z = Math.PI / 2; g.add(hab)
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), hull); node.position.x = 0.17; g.add(node)
  const truss = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), dark); truss.rotation.x = Math.PI / 2; g.add(truss)
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.2), panel); p.position.set(0, 0, s * 0.2); g.add(p)
    const p2 = p.clone(); p2.position.set(-0.17, 0, s * 0.2); p2.scale.set(0.8, 1, 0.85); g.add(p2)
  }
  const engine = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 16, 1, true), dark); engine.rotation.z = -Math.PI / 2; engine.position.x = -0.2; g.add(engine)
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), hull); dish.position.set(0.05, 0.085, 0); g.add(dish)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 8, 64), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.9 }))
  ring.rotation.x = Math.PI / 2; ring.name = 'halo'; g.add(ring)
  g.scale.setScalar(1.25)
  return g
}

export default function Orbit3D({ day, reduce, height = 420, delayLabel }: { day: number; reduce: boolean; height?: number; delayLabel?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ setDay: (d: number) => void; setView: (v: View) => void } | null>(null)
  const labels = useRef<Record<string, HTMLDivElement | null>>({})
  const [ok, setOk] = useState(true)
  const [view, setView] = useState<View>('overview')

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = makeRenderer(el, height)
    if (!renderer) { setOk(false); return }
    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(44, el.clientWidth / height, 0.05, 300)
    cam.position.set(0, 5.6, 7.6)
    const controls = new OrbitControls(cam, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.2; controls.maxDistance = 24
    controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.3

    scene.add(starField(1400, 70, 110))
    // faint milky band
    const band = starField(900, 80, 100, 99); band.scale.set(1, 0.12, 1); band.rotation.z = 0.5; (band.material as THREE.PointsMaterial).opacity = 0.5; scene.add(band)

    scene.add(new THREE.AmbientLight(0x7083ad, 0.5))
    scene.add(new THREE.PointLight(0xfff1c1, 90, 0, 1.5))
    // Sun: bright core + two glow layers
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }))
    scene.add(sun)
    const gt = glowTexture('rgba(255,224,150,0.95)', 'rgba(255,160,60,0.35)')
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(2.8, 2.8, 1); scene.add(glow)
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 })); corona.scale.set(5.5, 5.5, 1); scene.add(corona)

    const ring = (r: number, color: number, op: number) => {
      const pts = Array.from({ length: 241 }, (_, i) => new THREE.Vector3(Math.cos((i / 240) * Math.PI * 2) * r * AU, 0, -Math.sin((i / 240) * Math.PI * 2) * r * AU))
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }))
    }
    scene.add(ring(R_E, 0x60a5fa, 0.45), ring(R_M, 0xf97316, 0.45))
    // ecliptic grid for depth
    const grid = new THREE.PolarGridHelper(R_M * AU * 1.3, 0, 6, 96, 0x24365c, 0x24365c); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; grid.position.y = -0.02; scene.add(grid)

    const N = 160
    const tPts = Array.from({ length: N + 1 }, (_, i) => { const p = transferPos(i / N); return new THREE.Vector3(p.x, 0, p.z) })
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(tPts), new THREE.LineDashedMaterial({ color: 0x2dd4bf, dashSize: 0.16, gapSize: 0.12, transparent: true, opacity: 0.7 }))
    path.computeLineDistances(); scene.add(path)
    const trailMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.95 })
    let trail: THREE.Mesh | null = null

    const earth = new THREE.Group(), mars = new THREE.Group()
    const eTex = planetTexture('earth'), mTex = planetTexture('mars'), cTex = planetTexture('clouds'), moTex = planetTexture('moon', 128, 64)
    const eBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 48), new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.75, emissive: 0x0a1c3a, emissiveIntensity: 0.6 }))
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(0.248, 40, 40), new THREE.MeshStandardMaterial({ map: cTex, transparent: true, depthWrite: false }))
    const eAtmo = new THREE.Mesh(new THREE.SphereGeometry(0.285, 40, 40), fresnelMaterial(0x60a5fa, 2.4, 0.9, 0))
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 20), new THREE.MeshStandardMaterial({ map: moTex, roughness: 1 }))
    eBall.rotation.z = 0.41; clouds.rotation.z = 0.41
    earth.add(eBall, clouds, eAtmo, moon)
    const mBall = new THREE.Mesh(new THREE.SphereGeometry(0.18, 48, 48), new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.9, emissive: 0x3a1206, emissiveIntensity: 0.55 }))
    const mAtmo = new THREE.Mesh(new THREE.SphereGeometry(0.205, 40, 40), fresnelMaterial(0xfb923c, 3, 0.55, 0))
    mBall.rotation.z = 0.44
    mars.add(mBall, mAtmo)
    scene.add(earth, mars)

    const craft = buildCraft(); scene.add(craft)
    const craftGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(94,234,212,0.9)', 'rgba(45,212,191,0.25)'), depthWrite: false, blending: THREE.AdditiveBlending })); craftGlow.scale.set(0.9, 0.9, 1); scene.add(craftGlow)

    // Comms link Earth ↔ crew with a travelling signal pulse
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const link = new THREE.Line(linkGeo, new THREE.LineDashedMaterial({ color: 0x93c5fd, dashSize: 0.08, gapSize: 0.08, transparent: true, opacity: 0.6 })); scene.add(link)
    const ping = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0xbfdbfe })); scene.add(ping)

    // Solar storm: particles sweeping outward (shown only around the scenario's real 20 May 2024 event)
    const SP = 900, sDir = new Float32Array(SP * 3), sOff = new Float32Array(SP)
    let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < SP; i++) { const a = rnd() * Math.PI * 2, e = (rnd() - 0.5) * 0.5; sDir[i * 3] = Math.cos(a) * Math.cos(e); sDir[i * 3 + 1] = Math.sin(e); sDir[i * 3 + 2] = Math.sin(a) * Math.cos(e); sOff[i] = rnd() }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SP * 3), 3))
    const storm = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xfb7185, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(storm)

    let curDay = day, curView: View = 'overview'
    const cPos = new THREE.Vector3(), ePos = new THREE.Vector3()
    const place = (d: number) => {
      curDay = d
      const ea = planetAngle(d, 365.25, 0), ma = planetAngle(d, 687, MARS_A0)
      earth.position.set(Math.cos(ea) * R_E * AU, 0, -Math.sin(ea) * R_E * AU)
      mars.position.set(Math.cos(ma) * R_M * AU, 0, -Math.sin(ma) * R_M * AU)
      const f = d / MISSION_DAYS, p = transferPos(f), q = transferPos(Math.min(1, f + 0.012)), b = transferPos(Math.max(0, f - 0.012))
      craft.position.set(p.x, 0.04, p.z)
      craft.rotation.set(0, Math.atan2(-(q.z - b.z), q.x - b.x), 0)
      craftGlow.position.copy(craft.position)
      cPos.copy(craft.position); ePos.copy(earth.position)
      linkGeo.setFromPoints([ePos, cPos]); link.computeLineDistances()
      const n = Math.max(2, Math.round(f * N))
      if (trail) { scene.remove(trail); trail.geometry.dispose() }
      trail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tPts.slice(0, n + 1)), Math.max(8, n), 0.011, 6, false), trailMat); scene.add(trail)
      if (curView === 'follow') controls.target.copy(cPos)
    }
    const applyView = (v: View) => {
      curView = v
      controls.autoRotate = !reduce && v === 'overview'
      if (v === 'overview') { controls.target.set(0, 0, 0); cam.position.set(0, 5.6, 7.6) }
      else if (v === 'top') { controls.target.set(0, 0, 0); cam.position.set(0, 12, 0.01) }
      else { controls.target.copy(cPos); cam.position.set(cPos.x * 1.3 + 1.2, 1.9, cPos.z * 1.3 + 2.6) }
    }
    place(day)
    api.current = { setDay: place, setView: applyView }

    const v = new THREE.Vector3(), clock = new THREE.Clock()
    const haloRing = craft.getObjectByName('halo')!
    let raf = 0
    const tick = () => {
      const t = clock.getElapsedTime()
      controls.update()
      if (!reduce) { eBall.rotation.y = t * 0.25; clouds.rotation.y = t * 0.31; mBall.rotation.y = t * 0.22; haloRing.rotation.z = t * 0.8; corona.material.opacity = 0.3 + 0.08 * Math.sin(t * 1.3) }
      moon.position.set(Math.cos(t * 0.6) * 0.5, 0.05, Math.sin(t * 0.6) * 0.5)
      const k = reduce ? 0.5 : (t * 0.35) % 1
      ping.position.lerpVectors(ePos, cPos, k)
      const sd = curDay - SPE_DAY
      const sm = storm.material as THREE.PointsMaterial
      if (sd >= -1 && sd <= 3) {
        const reach = R_M * AU * 1.25, arr = sGeo.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < SP; i++) { const r = 0.45 + (((reduce ? 0.6 : t * 0.22) + sOff[i]) % 1) * reach; arr.setXYZ(i, sDir[i * 3] * r, sDir[i * 3 + 1] * r, sDir[i * 3 + 2] * r) }
        arr.needsUpdate = true; sm.opacity = 0.85
      } else sm.opacity = 0
      renderer.render(scene, cam)
      const w = el.clientWidth
      for (const [key, obj] of [['sun', sun], ['earth', earth], ['mars', mars], ['craft', craft]] as const) {
        const lab = labels.current[key]; if (!lab) continue
        v.copy(obj.position).project(cam)
        lab.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * height}px)`
        lab.style.opacity = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 ? '1' : '0'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, height); cam.aspect = el.clientWidth / height; cam.updateProjectionMatrix() })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose()
      disposeScene(scene); gt.dispose(); renderer.dispose(); renderer.domElement.remove(); api.current = null
    }
  }, [height, reduce])

  useEffect(() => { api.current?.setDay(day) }, [day])
  useEffect(() => { api.current?.setView(view) }, [view])

  const pct = Math.round((day / MISSION_DAYS) * 100)
  const r = transferPos(day / MISSION_DAYS).r
  const stormy = Math.abs(day - SPE_DAY) <= 3 && day - SPE_DAY >= -1
  if (!ok) return (
    <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-space-950/60 p-6 text-center text-sm text-ink-mute" style={{ height }} data-orbit-fallback>
      3D view needs WebGL. At day {day} the crew is {pct}% of the way to Mars, {r.toFixed(2)} AU from the Sun.
    </div>
  )
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_center,rgba(30,41,70,0.55),rgba(5,8,18,0.95))]" style={{ height }} data-orbit3d>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label={`3D view of the Earth to Mars transfer. Day ${day}: the crew is ${pct}% of the way, ${r.toFixed(2)} AU from the Sun. Drag to rotate, scroll to zoom.`} />
      {([['sun', 'Sun', 'text-amber-200'], ['earth', 'Earth', 'text-sky-200'], ['mars', 'Mars', 'text-orange-200'], ['craft', `Crew · D${day}`, 'text-teal']] as const).map(([k, t, c]) => (
        <div key={k} ref={(n) => { labels.current[k] = n }} className={`pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[10.5px] font-semibold ${c}`} style={{ willChange: 'transform' }} aria-hidden>
          <span className="inline-block -translate-x-1/2 -translate-y-9 rounded-md border border-white/10 bg-space-950/75 px-1.5 py-0.5 backdrop-blur">{t}</span>
        </div>
      ))}
      <div className="absolute left-3 top-3 flex gap-1 rounded-xl border border-white/10 bg-space-950/70 p-0.5 backdrop-blur" role="radiogroup" aria-label="3D camera view">
        {(['overview', 'follow', 'top'] as const).map((v) => (
          <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)} data-orbit-view={v}
            className={`focus-ring rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors ${view === v ? 'bg-teal/15 text-teal' : 'text-ink-soft hover:text-ink'}`}>{v === 'overview' ? 'Overview' : v === 'follow' ? 'Follow crew' : 'Top-down'}</button>
        ))}
      </div>
      {stormy && <div className="absolute right-3 top-3 rounded-lg border border-alert/50 bg-alert/15 px-2 py-1 text-[11px] font-medium text-alert">Solar storm passing</div>}
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-wrap items-end justify-between gap-2 text-[10.5px] text-ink-mute">
        <span>Orbits to scale (1.00 and 1.52 AU) · sizes enlarged · timing schematic · drag to rotate, scroll to zoom</span>
        <span className="num rounded-md bg-space-950/70 px-1.5 py-0.5 text-ink-soft">{pct}% of the way · {r.toFixed(2)} AU from Sun{delayLabel ? ` · signal ${delayLabel} one-way` : ''}</span>
      </div>
    </div>
  )
}
