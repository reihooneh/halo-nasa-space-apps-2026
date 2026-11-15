import { useEffect, useRef, useState } from 'react'
import { BatteryMedium, Bluetooth, BluetoothOff, Camera, CameraOff, Lock, RefreshCw, Square, TriangleAlert } from 'lucide-react'
import { useHalo } from '../state/store'
import { Illustrative, Panel, Prov } from '../ui/kit'
import { gauss, mulberry32 } from '../sim/prng'
import { blandAltman, type Pair } from '../engine/agreement'
import { detrend, estimatePulse, estimatePulse1, parseHrmFull, rmssdClean, type PulseEstimate } from '../engine/rppg'

/* ---------- Signal processing lives in engine/rppg.ts (pure, unit-tested); thin wrappers kept for compatibility ---------- */

export function estimateBpm(t: number[], v: number[]): { bpm: number | null; quality: number } {
  const e = estimatePulse1(t, v)
  return { bpm: e.bpm, quality: e.quality }
}
export function parseHrm(dv: DataView): { hr: number; rr: number[] } { const p = parseHrmFull(dv); return { hr: p.hr, rr: p.rr } }
export function rmssd(rr: number[]): number | null {
  if (rr.length < 3) return null
  let s = 0
  for (let i = 1; i < rr.length; i++) s += (rr[i] - rr[i - 1]) ** 2
  return Math.round(Math.sqrt(s / (rr.length - 1)))
}

/* ---------- UI ---------- */

export function SensorsPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-2" data-tour="sensors">
      <CameraPulse />
      <BleStrap />
    </div>
  )
}

/** Broadcast a finished reading so the validation panel can pair methods. */
const emit = (source: 'camera' | 'strap', bpm: number) => window.dispatchEvent(new CustomEvent('halo:sensor', { detail: { source, bpm } }))

export function SensorsView() {
  return (
    <div className="space-y-5">
      <SubHead n="1" title="Measure" text="Two real sensor paths that run in the browser. Nothing leaves the device." />
      <SensorsPanel />
      <SubHead n="2" title="Validate" text="Before a sensor is trusted, compare it with a reference method. HALO uses the standard Bland–Altman method and the ANSI heart-rate accuracy band." />
      <Validation />
    </div>
  )
}

export function SubHead({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex items-end gap-3 pt-1">
      <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-xs font-semibold text-teal">{n}</span>
      <div className="min-w-0"><h2 className="text-[15px] font-semibold text-ink">{title}</h2><p className="text-xs text-ink-mute">{text}</p></div>
      <span className="mb-3 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" aria-hidden />
    </div>
  )
}

function demoPairs(): Pair[] {
  const r = mulberry32(2026)
  return Array.from({ length: 24 }, (_, i) => {
    const ref = Math.round(52 + r() * 46)
    const err = gauss(r) * 2.6 + 0.8 + (i % 7 === 0 ? 7 : 0)
    return { a: Math.round(ref + err), b: ref, label: 'simulated' }
  })
}

function Validation() {
  const [pairs, setPairs] = useState<Pair[]>(demoPairs)
  const [demo, setDemo] = useState(true)
  const [last, setLast] = useState<{ camera?: number; strap?: number }>({})
  const [ma, setMa] = useState(''), [mb, setMb] = useState('')
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; setLast((l) => ({ ...l, [d.source]: d.bpm })) }
    window.addEventListener('halo:sensor', on)
    return () => window.removeEventListener('halo:sensor', on)
  }, [])
  const add = (p: Pair) => { setPairs((ps) => (demo ? [p] : [...ps, p])); setDemo(false) }
  const r = blandAltman(pairs)
  const W = 520, H = 260, P = { l: 44, r: 16, t: 14, b: 34 }
  const xs = pairs.map((p) => (p.a + p.b) / 2)
  const x0 = Math.min(40, ...xs) - 2, x1 = Math.max(110, ...xs) + 2
  const ylim = Math.max(15, ...(r ? r.points.map((p) => Math.abs(p.diff)) : [0]), r ? Math.abs(r.loaHigh) + 2 : 0, r ? Math.abs(r.loaLow) + 2 : 0)
  const X = (v: number) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r)
  const Y = (v: number) => P.t + ((ylim - v) / (2 * ylim)) * (H - P.t - P.b)
  const tol = (m: number) => Math.max(5, 0.1 * m)
  const band = Array.from({ length: 30 }, (_, i) => x0 + (i / 29) * (x1 - x0))
  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]" data-validation>
      <Panel title="Bland–Altman agreement" kicker="Camera estimate (test) vs chest strap (reference)" right={<>{demo && <Illustrative text="Simulated pairs" />}<Prov ids={['blandAltman', 'hrAccuracy']} /></>}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={r ? `Bland–Altman plot of ${r.n} pairs. Bias ${r.bias.toFixed(1)} bpm, limits of agreement ${r.loaLow.toFixed(1)} to ${r.loaHigh.toFixed(1)} bpm.` : 'Bland–Altman plot'}>
          <path d={`M${band.map((m) => `${X(m)},${Y(tol(m))}`).join(' L')} L${band.slice().reverse().map((m) => `${X(m)},${Y(-tol(m))}`).join(' L')} Z`} fill="#2DD4BF" fillOpacity="0.07" />
          {[-10, -5, 0, 5, 10].filter((v) => Math.abs(v) < ylim).map((v) => <g key={v}><line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke="#fff" strokeOpacity={v === 0 ? 0.18 : 0.05} /><text x={P.l - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#7C8AA5">{v > 0 ? '+' : ''}{v}</text></g>)}
          {[50, 60, 70, 80, 90, 100].filter((v) => v > x0 && v < x1).map((v) => <text key={v} x={X(v)} y={H - P.b + 14} textAnchor="middle" fontSize="10" fill="#7C8AA5">{v}</text>)}
          <text x={(W + P.l) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="#A9B6CC">Mean of both methods (bpm)</text>
          <text x={12} y={(H - P.b) / 2} textAnchor="middle" fontSize="10.5" fill="#A9B6CC" transform={`rotate(-90 12 ${(H - P.b) / 2})`}>Difference, test − reference (bpm)</text>
          {r && <>
            <line x1={P.l} x2={W - P.r} y1={Y(r.bias)} y2={Y(r.bias)} stroke="#60A5FA" strokeWidth="1.5" />
            <line x1={P.l} x2={W - P.r} y1={Y(r.loaHigh)} y2={Y(r.loaHigh)} stroke="#F59E0B" strokeDasharray="5 4" />
            <line x1={P.l} x2={W - P.r} y1={Y(r.loaLow)} y2={Y(r.loaLow)} stroke="#F59E0B" strokeDasharray="5 4" />
            <text x={W - P.r - 4} y={Y(r.bias) - 4} textAnchor="end" fontSize="10" fill="#60A5FA">bias {r.bias.toFixed(1)}</text>
            <text x={W - P.r - 4} y={Y(r.loaHigh) - 4} textAnchor="end" fontSize="10" fill="#F59E0B">+1.96 SD {r.loaHigh.toFixed(1)}</text>
            <text x={W - P.r - 4} y={Y(r.loaLow) + 12} textAnchor="end" fontSize="10" fill="#F59E0B">−1.96 SD {r.loaLow.toFixed(1)}</text>
            {r.points.map((p, i) => <circle key={i} cx={X(p.mean)} cy={Y(Math.max(-ylim, Math.min(ylim, p.diff)))} r="4" fill={p.ok ? '#2DD4BF' : '#F43F5E'} fillOpacity="0.85" stroke="#0B1220" />)}
          </>}
        </svg>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-ink-mute">
          <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-teal/30 align-middle" />ANSI band ±5 bpm or ±10%</span>
          <span><i className="mr-1 inline-block w-4 border-t-2 border-sky-400 align-middle" />mean bias</span>
          <span><i className="mr-1 inline-block w-4 border-t-2 border-dashed border-warn align-middle" />95% limits of agreement</span>
        </div>
      </Panel>
      <Panel title="Verdict" kicker={r ? `${r.n} paired readings` : 'Add pairs'}>
        {!r && <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-ink-soft">{pairs.length} pair so far. Need at least 2 pairs to compute bias and limits of agreement.</p>}
        {r && <dl className="grid grid-cols-2 gap-2 text-center">
          {[['Bias', `${r.bias >= 0 ? '+' : ''}${r.bias.toFixed(1)} bpm`], ['Limits of agreement', `${r.loaLow.toFixed(1)} to ${r.loaHigh.toFixed(1)}`], ['Mean abs. error', `${r.mae.toFixed(1)} bpm`], ['Within ANSI band', `${Math.round(r.withinSpec * 100)}%`]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5"><dt className="text-[11px] text-ink-mute">{k}</dt><dd className="num mt-0.5 text-sm font-semibold">{v}</dd></div>
          ))}
        </dl>}
        {r && <p className={`mt-3 rounded-xl border p-2.5 text-xs ${r.withinSpec >= 0.95 ? 'border-ok/30 bg-ok/[0.06]' : 'border-warn/40 bg-warn/[0.07]'}`} data-verdict>{r.withinSpec >= 0.95 ? 'At least 95% of readings fall inside the ANSI band: acceptable for trend monitoring.' : `Only ${Math.round(r.withinSpec * 100)}% fall inside the ANSI band. HALO would keep this sensor in “advisory” mode and prefer the reference device.`}</p>}
        <div className="mt-3 space-y-2 text-xs">
          <div className="label">Add a live pair</div>
          <div className="flex flex-wrap items-center gap-2 text-ink-soft">Camera <b className="num text-ink">{last.camera ?? '—'}</b> · Strap <b className="num text-ink">{last.strap ?? '—'}</b>
            <button className="btn-ghost px-2 py-1 text-[11px]" disabled={last.camera == null || last.strap == null} onClick={() => add({ a: last.camera!, b: last.strap! })}>Add pair</button></div>
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); const a = Number(ma), b = Number(mb); if (a > 20 && b > 20) { add({ a, b }); setMa(''); setMb('') } }}>
            <label className="sr-only" htmlFor="ba-a">Test reading</label><input id="ba-a" inputMode="numeric" value={ma} onChange={(e) => setMa(e.target.value)} placeholder="test bpm" className="focus-ring w-20 rounded-lg border border-white/10 bg-space-900 px-2 py-1" />
            <label className="sr-only" htmlFor="ba-b">Reference reading</label><input id="ba-b" inputMode="numeric" value={mb} onChange={(e) => setMb(e.target.value)} placeholder="ref bpm" className="focus-ring w-20 rounded-lg border border-white/10 bg-space-900 px-2 py-1" />
            <button className="btn-ghost px-2 py-1 text-[11px]" type="submit" data-ba-add>Add manual pair</button>
            {!demo && <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => { setPairs(demoPairs()); setDemo(true) }}>Restore demo set</button>}
          </form>
          <p className="text-[11px] text-ink-mute">Your first real pair replaces the simulated set. Use the strap as the reference because chest-strap ECG is the usual criterion device.</p>
        </div>
      </Panel>
    </div>
  )
}

function Trace({ data, color = '#2DD4BF', label }: { data: number[]; color?: string; label?: string }) {
  if (data.length < 2) return <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/[0.07] text-[11px] text-ink-mute" aria-hidden>{label ?? 'Waiting for signal'}</div>
  const lo = Math.min(...data), hi = Math.max(...data)
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * 300).toFixed(1)},${(58 - ((v - lo) / (hi - lo || 1)) * 52).toFixed(1)}`).join('')
  return (
    <svg viewBox="0 0 300 64" className="h-16 w-full rounded-xl bg-space-950/50" preserveAspectRatio="none" aria-hidden>
      {[16, 32, 48].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#fff" strokeOpacity="0.04" />)}
      <path d={`${d} L300,64 L0,64 Z`} fill={color} fillOpacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const MEASURE_S = 20, SETTLE_MS = 1500
type CamState = 'idle' | 'starting' | 'live' | 'sim' | 'done' | 'error'
const EMPTY: PulseEstimate = { bpm: null, quality: 0, snrDb: null, fps: 0 }

/** Why the camera can't run here, or null if it can be tried. */
function cameraBlocker(): string | null {
  if (typeof window === 'undefined') return 'No browser.'
  if (!window.isSecureContext) return 'The camera needs a secure (HTTPS) page. Open the public link instead of a file.'
  const fp = (document as unknown as { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy
  if (fp && !fp.allowsFeature('camera')) return 'This embedded page is not allowed to use the camera. Open HALO in its own tab (public link).'
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser has no camera API.'
  return null
}

function CameraPulse() {
  const h = useHalo()
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const frameHandle = useRef<number | null>(null), tick = useRef<number | null>(null), simIv = useRef<number | null>(null)
  const run = useRef(0)
  const T = useRef<number[]>([]), R = useRef<number[]>([]), G = useRef<number[]>([]), B = useRef<number[]>([])
  const lumaJumps = useRef<number[]>([])
  const [state, setState] = useState<CamState>('idle')
  const [err, setErr] = useState('')
  const [trace, setTrace] = useState<number[]>([])
  const [est, setEst] = useState<PulseEstimate>(EMPTY)
  const [left, setLeft] = useState(MEASURE_S)
  const [hint, setHint] = useState<string | null>(null)

  const release = () => {
    run.current++
    if (tick.current) window.clearInterval(tick.current)
    if (simIv.current) window.clearInterval(simIv.current)
    const v = video.current as (HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void }) | null
    if (frameHandle.current != null) { v?.cancelVideoFrameCallback?.(frameHandle.current); cancelAnimationFrame(frameHandle.current) }
    tick.current = simIv.current = frameHandle.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }
  useEffect(() => release, [])
  const reset = () => { T.current = []; R.current = []; G.current = []; B.current = []; lumaJumps.current = []; setTrace([]); setEst(EMPTY); setErr(''); setHint(null); setLeft(MEASURE_S) }

  const push = (now: number, r: number, g: number, b: number) => {
    const n = T.current.length
    if (n) { const prev = 0.299 * R.current[n - 1] + 0.587 * G.current[n - 1] + 0.114 * B.current[n - 1], cur = 0.299 * r + 0.587 * g + 0.114 * b; lumaJumps.current.push(Math.abs(cur - prev) / (prev || 1)); if (lumaJumps.current.length > 45) lumaJumps.current.shift() }
    T.current.push(now); R.current.push(r); G.current.push(g); B.current.push(b)
  }
  /** Mean R,G,B over the face box (centre-cropped so the box matches the on-screen guide). */
  const sampleVideo = () => {
    const v = video.current
    if (!v || v.readyState < 2 || !v.videoWidth) return
    const c = (canvas.current ??= document.createElement('canvas'))
    c.width = 64; c.height = 48
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const ar = v.videoWidth / v.videoHeight, want = 4 / 3
    const sw = ar > want ? v.videoHeight * want : v.videoWidth, sh = ar > want ? v.videoHeight : v.videoWidth / want
    ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, 64, 48)
    const px = ctx.getImageData(20, 6, 24, 24).data
    let r = 0, g = 0, b = 0
    for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2] }
    const n = px.length / 4
    push(performance.now(), r / n, g / n, b / n)
  }
  const finish = (id: number) => {
    if (run.current !== id) return
    const fin = estimatePulse(T.current, R.current, G.current, B.current, SETTLE_MS)
    release(); setEst(fin); setLeft(0)
    if (fin.bpm == null) { setState('error'); setErr(fin.fps < 8 ? 'The camera delivered too few frames (keep this tab visible while measuring).' : 'No stable pulse signal was found.'); return }
    emit('camera', fin.bpm); setState('done')
  }
  const begin = (sim: boolean) => {
    const id = ++run.current
    const start = performance.now()
    tick.current = window.setInterval(() => {
      if (run.current !== id) return
      const el = (performance.now() - start) / 1000
      setLeft(Math.max(0, Math.ceil(MEASURE_S - el)))
      const n = T.current.length
      if (n > 20) {
        setTrace(detrend(G.current.slice(-180), 30).slice(8, -8))
        const k = n - 1, luma = 0.299 * R.current[k] + 0.587 * G.current[k] + 0.114 * B.current[k]
        const moving = lumaJumps.current.filter((j) => j > 0.02).length > lumaJumps.current.length * 0.2
        setHint(sim ? null : luma < 45 ? 'Too dark: face a light or a window.' : luma > 238 ? 'Too bright: move out of direct light.' : moving ? 'Hold still and keep your face inside the box.' : null)
      }
      if (el > 8 && Math.round(el * 4) % 4 === 0) {
        const cut = performance.now() - 12000, k0 = Math.max(0, T.current.findIndex((x) => x >= cut))
        const e = estimatePulse(T.current.slice(k0), R.current.slice(k0), G.current.slice(k0), B.current.slice(k0))
        if (e.bpm != null) setEst(e)
      }
      if (el >= MEASURE_S) finish(id)
    }, 250)
    if (sim) {
      const rnd = mulberry32(42)
      simIv.current = window.setInterval(() => {
        const now = performance.now(), s = (now - start) / 1000
        const p = Math.sin(2 * Math.PI * (64 / 60) * s) + 0.3 * Math.sin(4 * Math.PI * (64 / 60) * s), light = 1 + 0.03 * Math.sin(2 * Math.PI * 0.12 * s)
        push(now, 200 * light * (1 + 0.0020 * p + gauss(rnd) * 0.0012), 150 * light * (1 + 0.0046 * p + gauss(rnd) * 0.0012), 120 * light * (1 + 0.0032 * p + gauss(rnd) * 0.0012))
      }, 33)
      return
    }
    const v = video.current as (HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }) | null
    const onFrame = () => {
      if (run.current !== id) return
      sampleVideo()
      frameHandle.current = v?.requestVideoFrameCallback ? v.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame)
    }
    onFrame()
  }
  const startCam = async () => {
    release(); reset()
    const block = cameraBlocker()
    if (block) { setState('error'); setErr(block); return }
    setState('starting')
    const id = run.current
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false })
      if (run.current !== id) { s.getTracks().forEach((t) => t.stop()); return }
      stream.current = s
      s.getVideoTracks()[0]?.addEventListener('ended', () => { if (stream.current === s) { release(); setState('error'); setErr('The camera was disconnected or taken by another app.') } })
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
      setState('live'); begin(false)
    } catch (e) {
      const name = (e as Error).name
      setState('error')
      setErr(name === 'NotAllowedError' || name === 'SecurityError' ? 'Camera permission was declined or is blocked for this page. Allow the camera in the address bar and retry.'
        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'No camera was found on this device.'
        : name === 'NotReadableError' ? 'The camera is in use by another app. Close it and retry.' : 'The camera could not be started here.')
    }
  }
  const startSim = () => { release(); reset(); setState('sim'); begin(true) }
  const stopNow = () => { release(); setState(est.bpm != null ? 'done' : 'idle') }
  const q = est.quality, busy = state === 'live' || state === 'sim'
  const qLabel = est.bpm == null ? '—' : q > 0.55 ? 'good' : q > 0.25 ? 'fair' : 'low'
  const canLog = state === 'done' && est.bpm != null && q > 0.2
  return (
    <Panel title="Camera pulse estimate" kicker="Contact-free · on-device" right={<><Illustrative text="Demo-grade estimate, not clinical" /><span className="chip border-white/10 text-ink-mute"><Lock size={11} /> On-device</span></>}>
      <p className="text-xs text-ink-soft">Each heartbeat slightly changes skin colour. HALO tracks red, green and blue over your face and combines them with the POS method, which cancels most light and motion changes, then finds the rhythm between 42 and 210 bpm. Frames stay in memory and are never stored or sent.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-space-950" data-cam-state={state}>
          <video ref={video} className={`h-full w-full scale-x-[-1] object-cover ${state === 'live' ? '' : 'hidden'}`} muted playsInline aria-label="Camera preview" />
          {state === 'live' && <><div className="absolute left-[31%] top-[12%] h-[50%] w-[38%] rounded-[40%] border-2 border-teal/90 shadow-[0_0_0_999px_rgba(7,11,22,0.35)]" aria-hidden /><span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-ink">Fit your face in the oval</span></>}
          {state !== 'live' && <div className="flex h-full flex-col items-center justify-center gap-1 text-ink-mute">{state === 'sim' ? <><span className="h-10 w-10 animate-pulse rounded-full bg-teal/20 ring-2 ring-teal/40" /><span className="text-xs">Simulated 64 bpm signal</span></> : state === 'starting' ? <span className="text-xs">Starting camera…</span> : <Camera size={28} aria-hidden />}</div>}
          {busy && <div className="absolute inset-x-0 top-0 h-1 bg-white/10"><div className="h-full bg-teal transition-[width] duration-300" style={{ width: `${((MEASURE_S - left) / MEASURE_S) * 100}%` }} /></div>}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2"><span className="num text-4xl font-semibold" data-cam-bpm>{est.bpm ?? '—'}</span><span className="text-sm text-ink-mute">bpm</span>
            {busy && <span className="num ml-auto rounded-md bg-white/[0.05] px-1.5 py-0.5 text-xs text-ink-soft">{left}s left</span>}</div>
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="text-ink-mute">Signal</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10" aria-hidden><span className="block h-full rounded-full transition-all" style={{ width: `${Math.round(q * 100)}%`, background: q > 0.55 ? '#34D399' : q > 0.25 ? '#F59E0B' : '#F43F5E' }} /></span>
            <span className={q > 0.55 ? 'text-ok' : q > 0.25 ? 'text-warn' : est.bpm == null ? 'text-ink-mute' : 'text-alert'} data-cam-quality>{qLabel}</span>
            {est.snrDb != null && <span className="num text-ink-mute">{est.snrDb.toFixed(1)} dB · {est.fps.toFixed(0)} fps</span>}
          </div>
          <div className="mt-2"><Trace data={trace} label={busy ? 'Collecting…' : 'Pulse wave appears here'} /></div>
          {hint && busy && <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-warn" role="status"><TriangleAlert size={12} aria-hidden />{hint}</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {busy || state === 'starting'
          ? <button className="btn-ghost" onClick={stopNow}><Square size={14} aria-hidden /> Stop</button>
          : <button className="btn-primary" onClick={startCam} data-cam><Camera size={15} aria-hidden /> {state === 'done' || state === 'error' ? 'Measure again' : `Measure with camera (${MEASURE_S} s)`}</button>}
        {!busy && state !== 'starting' && <button className="btn-ghost" onClick={startSim} data-cam-sim>Run with simulated signal</button>}
        {canLog && <button className="btn-ghost" onClick={() => { h.logValue('hr', est.bpm!); h.pushToast('Heart rate logged', `${est.bpm} bpm from camera estimate (demo-grade).`, 'ok') }}>Log as resting HR</button>}
      </div>
      {state === 'done' && est.bpm != null && !canLog && <div className="mt-2 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-xs text-ink-soft" role="status">Signal too weak to trust, so HALO won’t log it. Try again in brighter, even light and hold still.</div>}
      {state === 'error' && <div className="mt-2 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-xs text-ink-soft" role="status" data-cam-error><CameraOff size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden /><span>{err} You can run the same algorithm on a simulated signal instead.</span></div>}
      <ol className="mt-3 grid gap-1.5 text-[11px] text-ink-mute sm:grid-cols-3">{['Sit still, face a light or window', 'Fit your face in the oval', 'Wait 20 s, then confirm with a strap or cuff'].map((x, i) => <li key={x} className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] px-2 py-1.5"><span className="num flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] text-ink-soft">{i + 1}</span>{x}</li>)}</ol>
    </Panel>
  )
}

type BleState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'sim' | 'error'
/* eslint-disable @typescript-eslint/no-explicit-any */
function BleStrap() {
  const h = useHalo()
  const [state, setState] = useState<BleState>('idle')
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [hrs, setHrs] = useState<number[]>([])
  const [rrs, setRrs] = useState<number[]>([])
  const [battery, setBattery] = useState<number | null>(null)
  const [contact, setContact] = useState<'ok' | 'lost' | 'unsupported'>('unsupported')
  const [stale, setStale] = useState(false)
  const dev = useRef<any>(null), chr = useRef<any>(null), iv = useRef<number | null>(null), dog = useRef<number | null>(null)
  const lastPkt = useRef(0), userClosed = useRef(false), alive = useRef(true)
  const supported = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth
  const push = (hr: number, rr: number[]) => {
    lastPkt.current = performance.now(); setStale(false)
    if (hr >= 25 && hr <= 250) setHrs((a) => [...a, hr].slice(-120))
    if (rr.length) setRrs((a) => [...a, ...rr].slice(-180))
  }
  const onValue = (e: any) => { const p = parseHrmFull(e.target.value as DataView); setContact(p.contact); if (p.contact !== 'lost') push(p.hr, p.rr) }
  const onGone = () => { if (!userClosed.current && alive.current) void reconnect() }
  const teardown = () => {
    if (iv.current) window.clearInterval(iv.current)
    if (dog.current) window.clearInterval(dog.current)
    iv.current = dog.current = null
    try { chr.current?.removeEventListener('characteristicvaluechanged', onValue) } catch { /* ignore */ }
    try { dev.current?.removeEventListener('gattserverdisconnected', onGone) } catch { /* ignore */ }
    try { dev.current?.gatt?.disconnect() } catch { /* ignore */ }
    chr.current = null
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; userClosed.current = true; teardown() } }, [])
  const subscribe = async (d: any) => {
    const server = await d.gatt.connect()
    const svc = await server.getPrimaryService('heart_rate')
    const ch = await svc.getCharacteristic('heart_rate_measurement')
    ch.addEventListener('characteristicvaluechanged', onValue)
    await ch.startNotifications()
    chr.current = ch
    try { const bs = await server.getPrimaryService('battery_service'); const bc = await bs.getCharacteristic('battery_level'); const v = await bc.readValue(); if (alive.current) setBattery(v.getUint8(0)) } catch { /* battery service is optional */ }
  }
  const watchdog = () => {
    if (dog.current) window.clearInterval(dog.current)
    lastPkt.current = performance.now()
    dog.current = window.setInterval(() => setStale(performance.now() - lastPkt.current > 5000), 1000)
  }
  async function reconnect() {
    const d = dev.current
    if (!d) return
    setState('reconnecting')
    for (const wait of [800, 1600, 3200]) {
      await new Promise((r) => setTimeout(r, wait))
      if (userClosed.current || !alive.current) return
      try { await subscribe(d); if (alive.current) { setState('live'); watchdog() } return } catch { /* try again */ }
    }
    if (alive.current) { teardown(); dev.current = null; setState('error'); setErr('The strap disconnected and did not come back. Check it is on and in range, then reconnect.') }
  }
  const disconnect = () => { userClosed.current = true; teardown(); dev.current = null; setState('idle'); setStale(false) }
  const clear = () => { setErr(''); setHrs([]); setRrs([]); setBattery(null); setContact('unsupported'); setStale(false) }
  const connect = async () => {
    teardown(); clear(); userClosed.current = false
    if (!window.isSecureContext) { setState('error'); setErr('Bluetooth needs a secure (HTTPS) page. Open the public link instead of a file.'); return }
    if (!supported) { setState('error'); setErr('Web Bluetooth is not available in this browser or page (use Chrome or Edge on desktop or Android).'); return }
    setState('connecting')
    try {
      const d = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }], optionalServices: ['battery_service'] })
      dev.current = d; setName(d.name || 'Heart-rate strap')
      d.addEventListener('gattserverdisconnected', onGone)
      await subscribe(d)
      if (!alive.current) return
      setState('live'); watchdog()
    } catch (e) {
      const n = (e as Error).name
      teardown(); dev.current = null; setState('error')
      setErr(n === 'NotFoundError' ? 'No strap selected.' : n === 'SecurityError' || n === 'NotAllowedError' ? 'Bluetooth is blocked for this page. Open HALO in its own tab and allow Bluetooth.' : 'Could not connect (strap out of range, asleep, or paired to another device). Wet the electrodes, wear it, and retry.')
    }
  }
  const simulate = () => {
    teardown(); clear(); userClosed.current = true; setName('Simulated strap'); setState('sim'); setBattery(null)
    const r = mulberry32(7); let k = 0
    iv.current = window.setInterval(() => {
      k++
      const base = 60 + 3 * Math.sin(k / 9)
      push(Math.round(base + gauss(r) * 0.8), [60000 / base + gauss(r) * 25])
    }, 1000)
  }
  const on = state === 'live' || state === 'sim' || state === 'reconnecting'
  const cur = hrs.at(-1)
  const recent = hrs.slice(-60), sorted = [...recent].sort((a, b) => a - b)
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  useEffect(() => { if (med != null && hrs.length >= 10 && hrs.length % 10 === 0) emit('strap', med) }, [med, hrs.length])
  const hrv = rmssdClean(rrs)
  const Stat = ({ k, v, u, attr }: { k: string; v: string | number; u: string; attr: string }) => (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="label">{k}</div><div className="num mt-1 text-3xl font-semibold" {...{ [attr]: '' }}>{v}</div><div className="text-[11px] text-ink-mute">{u}</div></div>
  )
  return (
    <Panel title="Bluetooth heart-rate strap" kicker="Standard GATT Heart Rate service (0x180D)" right={<span className={`chip ${state === 'live' ? 'border-ok/40 text-ok' : state === 'reconnecting' ? 'border-warn/40 text-warn' : 'border-white/10 text-ink-mute'}`} data-ble-state={state}><Bluetooth size={11} aria-hidden />{state === 'live' ? 'Connected' : state === 'reconnecting' ? 'Reconnecting…' : state === 'sim' ? 'Simulated' : state === 'connecting' ? 'Pairing…' : 'Not connected'}</span>}>
      <p className="text-xs text-ink-soft">Pairs with any chest strap or watch that broadcasts the standard Bluetooth Heart Rate service (Polar, Garmin, Wahoo, Coospo and others). HALO reads heart rate and beat-to-beat (RR) intervals, filters out dropped beats, and reconnects by itself if the link drops.</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat k="Live HR" v={cur ?? '—'} u="bpm" attr="data-ble-live" />
        <Stat k="Median" v={med ?? '—'} u={`bpm · last ${recent.length} readings`} attr="data-ble-median" />
        <Stat k="HRV RMSSD" v={hrv.rmssd ?? '—'} u={`ms · ${hrv.used} beat pairs${hrv.dropped ? `, ${hrv.dropped} filtered` : ''}`} attr="data-ble-hrv" />
      </div>
      <div className="mt-2"><Trace data={hrs} color="#F43F5E" label={on ? 'Waiting for the first beat…' : 'Heart-rate trend appears here'} /></div>
      {on && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-mute">
        <span className="break-words">{name}</span>
        {battery != null && <span className="chip border-white/10 px-2 py-0.5 text-[10.5px]" data-ble-battery><BatteryMedium size={11} aria-hidden />{battery}%</span>}
        {contact !== 'unsupported' && <span className={`chip px-2 py-0.5 text-[10.5px] ${contact === 'ok' ? 'border-ok/30 text-ok' : 'border-warn/40 text-warn'}`} data-ble-contact={contact}>{contact === 'ok' ? 'Skin contact good' : 'No skin contact'}</span>}
        {hrs.length > 0 && <span className="num">range {Math.min(...hrs)}–{Math.max(...hrs)} bpm</span>}
      </div>}
      {state === 'live' && (stale || contact === 'lost') && <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-warn/30 bg-warn/[0.06] p-2 text-xs text-ink-soft" role="status" data-ble-stale><TriangleAlert size={13} className="text-warn" aria-hidden />{contact === 'lost' ? 'The strap reports no skin contact. Moisten the electrodes and tighten it.' : 'No data for 5 seconds. Check the strap is snug and in range.'}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {on
          ? <button className="btn-ghost" onClick={disconnect}><BluetoothOff size={15} aria-hidden /> Disconnect {name}</button>
          : <button className="btn-primary" onClick={connect} disabled={state === 'connecting'} data-ble>{state === 'error' ? <RefreshCw size={15} aria-hidden /> : <Bluetooth size={15} aria-hidden />}{state === 'connecting' ? 'Choose your strap…' : state === 'error' ? 'Try again' : 'Connect strap'}</button>}
        {!on && state !== 'connecting' && <button className="btn-ghost" onClick={simulate} data-ble-sim>Use simulated strap</button>}
        {med != null && hrs.length >= 10 && <button className="btn-ghost" onClick={() => { h.logValue('hr', med); h.pushToast('Heart rate logged', `${med} bpm median from ${name}.`, 'ok') }} data-ble-log>Log median as resting HR</button>}
      </div>
      {state === 'error' && <div className="mt-2 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-xs text-ink-soft" role="status" data-ble-error>{err} The simulated strap shows the same flow.</div>}
      {state === 'sim' && <div className="mt-2"><Illustrative text="Simulated strap data" /></div>}
      <ol className="mt-3 grid gap-1.5 text-[11px] text-ink-mute sm:grid-cols-3">{['Wet the electrodes and put the strap on', 'Press Connect and pick it from the list', 'Sit still for 60 s, then log the median'].map((x, i) => <li key={x} className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] px-2 py-1.5"><span className="num flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] text-ink-soft">{i + 1}</span>{x}</li>)}</ol>
    </Panel>
  )
}
