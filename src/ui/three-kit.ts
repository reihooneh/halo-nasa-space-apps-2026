// Shared three.js helpers: renderer setup with WebGL fallback, procedural textures (no image files), hologram shader.
import * as THREE from 'three'

export function hasWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export function makeRenderer(el: HTMLElement, height: number): THREE.WebGLRenderer | null {
  if (!hasWebGL()) return null
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    r.setSize(el.clientWidth, height)
    r.outputColorSpace = THREE.SRGBColorSpace
    r.domElement.setAttribute('aria-hidden', 'true')
    r.domElement.style.display = 'block'
    el.appendChild(r.domElement)
    return r
  } catch { return null }
}

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    m.geometry?.dispose?.()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    const kill = (x: THREE.Material) => { const t = (x as THREE.MeshStandardMaterial).map; t?.dispose?.(); x.dispose() }
    if (Array.isArray(mat)) mat.forEach(kill); else if (mat) kill(mat)
  })
}

/* ---- seeded 3D value noise (fbm), so planet textures wrap without a seam ---- */
const hash = (x: number, y: number, z: number, s: number) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453; return h - Math.floor(h) }
const sm = (t: number) => t * t * (3 - 2 * t)
function vnoise(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi)
  const L = (a: number, b: number, t: number) => a + (b - a) * t
  return L(
    L(L(hash(xi, yi, zi, s), hash(xi + 1, yi, zi, s), xf), L(hash(xi, yi + 1, zi, s), hash(xi + 1, yi + 1, zi, s), xf), yf),
    L(L(hash(xi, yi, zi + 1, s), hash(xi + 1, yi, zi + 1, s), xf), L(hash(xi, yi + 1, zi + 1, s), hash(xi + 1, yi + 1, zi + 1, s), xf), yf), zf)
}
export function fbm(x: number, y: number, z: number, s: number, oct = 5) {
  let a = 0.5, f = 1, v = 0, n = 0
  for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, z * f, s + i); n += a; a *= 0.5; f *= 2 }
  return v / n
}

type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Procedural planet surface (original artwork generated in code, not imagery). */
export function planetTexture(kind: 'earth' | 'mars' | 'clouds' | 'moon', w = 384, h = 192): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const img = g.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    const lat = (j / (h - 1) - 0.5) * Math.PI
    for (let i = 0; i < w; i++) {
      const lon = (i / w) * Math.PI * 2
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon)
      let col: RGB = [0, 0, 0], alpha = 255
      const pole = Math.abs(lat) / (Math.PI / 2)
      if (kind === 'earth') {
        const n = fbm(x * 1.9 + 3, y * 1.9, z * 1.9, 11, 6), d = fbm(x * 5, y * 5, z * 5, 23, 4)
        if (n > 0.535) col = mix(mix([46, 110, 62], [150, 132, 84], Math.min(1, Math.max(0, (d - 0.35) * 2.2))), [205, 205, 190], Math.max(0, (n - 0.66) * 5))
        else col = mix([8, 38, 92], [28, 98, 168], Math.min(1, Math.max(0, (n - 0.3) * 4)))
        if (pole > 0.86 - d * 0.1) col = [236, 242, 248]
      } else if (kind === 'mars') {
        const n = fbm(x * 2.2, y * 2.2 + 5, z * 2.2, 37, 6), d = fbm(x * 7, y * 7, z * 7, 41, 3)
        col = mix([196, 96, 52], [112, 52, 34], Math.min(1, Math.max(0, (n - 0.38) * 3.2)))
        col = mix(col, [226, 150, 96], Math.max(0, (d - 0.6) * 1.6))
        if (pole > 0.9 - d * 0.06) col = [240, 232, 224]
      } else if (kind === 'moon') {
        const n = fbm(x * 3, y * 3, z * 3, 53, 5); const v = 110 + n * 110; col = [v, v, v * 1.02]
      } else {
        const n = fbm(x * 3.2 + 9, y * 4.6, z * 3.2, 71, 5); col = [255, 255, 255]; alpha = Math.max(0, Math.min(1, (n - 0.5) * 4.2)) * 235
      }
      const k = (j * w + i) * 4
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = alpha
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}

export function glowTexture(inner: string, mid: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, inner); gr.addColorStop(0.35, mid); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** Rim-lit "hologram" material: bright at grazing angles, see-through face-on. */
export function fresnelMaterial(color: number, power = 2.2, intensity = 1, base = 0.04): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uIntensity: { value: intensity }, uBase: { value: base } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uPower; uniform float uIntensity; uniform float uBase; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower); gl_FragColor = vec4(uColor, (f + uBase) * uIntensity); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}

export function starField(count: number, rMin: number, rMax: number, seed = 7): THREE.Points {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const pos: number[] = [], col: number[] = []
  for (let i = 0; i < count; i++) {
    const t = rnd() * Math.PI * 2, p = Math.acos(2 * rnd() - 1), r = rMin + rnd() * (rMax - rMin)
    pos.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t))
    const w = rnd(); col.push(0.75 + 0.25 * w, 0.8 + 0.15 * rnd(), 1 - 0.25 * w)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }))
}

/** Capsule between two points. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a), len = d.length()
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14), mat)
  m.position.copy(a).addScaledVector(d, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  return m
}
