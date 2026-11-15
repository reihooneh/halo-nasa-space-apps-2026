import { useEffect, useRef, useState } from 'react'
import { Bluetooth, BluetoothOff, Camera, CameraOff, Lock, Square } from 'lucide-react'
import { useHalo } from '../state/store'
import { Illustrative, Panel, Prov } from '../ui/kit'
import { gauss, mulberry32 } from '../sim/prng'
import { blandAltman, type Pair } from '../engine/agreement'

/* ---------- Signal processing (pure, unit-testable) ---------- */

/** Estimate pulse (bpm) from a camera colour trace using a direct DFT on (possibly irregular) samples, 0.75–3 Hz band. */
export function estimateBpm(t: number[], v: number[]): { bpm: number | null; quality: number } {
  const n = Math.min(t.length, v.length)
  if (n < 60) return { bpm: null, quality: 0 }
  const dur = (t[n - 1] - t[0]) / 1000
  if (dur < 6) return { bpm: null, quality: 0 }
  // detrend: subtract a ~1 s moving average, then normalise
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0
    for (let j = i; j >= 0 && t[i] - t[j] <= 500; j--) { s += v[j]; c++ }
    for (let j = i + 1; j < n && t[j] - t[i] <= 500; j++) { s += v[j]; c++ }
    out.push(v[i] - s / c)
  }
  const mean = out.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(out.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1
  const x = out.map((y) => (y - mean) / sd)
  let best = 0, bestF = 0, total = 0
  for (let f = 0.75; f <= 3.0; f += 0.01) {
    let re = 0, im = 0
    for (let i = 0; i < n; i++) { const ph = 2 * Math.PI * f * ((t[i] - t[0]) / 1000); re += x[i] * Math.cos(ph); im += x[i] * Math.sin(ph) }
    const p = re * re + im * im
    total += p
    if (p > best) { best = p; bestF = f }
  }
  const quality = total ? best / total : 0
  return { bpm: Math.round(bestF * 60), quality: Math.min(1, quality * 12) }
}

/** Parse a Bluetooth GATT Heart Rate Measurement (0x2A37) value. */
export function parseHrm(dv: DataView): { hr: number; rr: number[] } {
  const flags = dv.getUint8(0)
  const wide = flags & 0x01
  let o = 1
  const hr = wide ? dv.getUint16(o, true) : dv.getUint8(o)
  o += wide ? 2 : 1
  if (flags & 0x08) o += 2 // energy expended
  const rr: number[] = []
  if (flags & 0x10) for (; o + 1 < dv.byteLength; o += 2) rr.push((dv.getUint16(o, true) / 1024) * 1000)
  return { hr, rr }
}

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

function Trace({ data, color = '#2DD4BF' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div className="h-14 rounded-xl bg-white/[0.02]" aria-hidden />
  const lo = Math.min(...data), hi = Math.max(...data)
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * 300).toFixed(1)},${(52 - ((v - lo) / (hi - lo || 1)) * 46).toFixed(1)}`).join('')
  return <svg viewBox="0 0 300 56" className="h-14 w-full" preserveAspectRatio="none" aria-hidden><path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>
}

function CameraPulse() {
  const h = useHalo()
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const raf = useRef<number | null>(null)
  const ts = useRef<number[]>([]), gs = useRef<number[]>([])
  const [state, setState] = useState<'idle' | 'starting' | 'live' | 'sim' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [trace, setTrace] = useState<number[]>([])
  const [est, setEst] = useState<{ bpm: number | null; quality: number }>({ bpm: null, quality: 0 })
  const [left, setLeft] = useState(20)
  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])
  const loop = (start: number, sim: boolean) => {
    const r = mulberry32(42)
    const step = () => {
      const now = performance.now()
      let g: number | null = null
      if (sim) {
        const tt = (now - start) / 1000
        g = 120 + 0.6 * Math.sin(2 * Math.PI * (64 / 60) * tt) + 0.25 * Math.sin(2 * Math.PI * 0.2 * tt) + gauss(r) * 0.25
      } else if (video.current && video.current.readyState >= 2) {
        const c = (canvas.current ??= document.createElement('canvas'))
        c.width = 64; c.height = 48
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video.current, 0, 0, 64, 48)
          const px = ctx.getImageData(22, 6, 20, 10).data // forehead region of interest
          let sum = 0
          for (let i = 1; i < px.length; i += 4) sum += px[i]
          g = sum / (px.length / 4)
        }
      }
      if (g != null) { ts.current.push(now); gs.current.push(g) }
      const el = (now - start) / 1000
      setLeft(Math.max(0, Math.ceil(20 - el)))
      if (ts.current.length % 10 === 0) {
        setTrace(gs.current.slice(-150))
        if (el > 7) {
          const cut = now - 10000
          const k0 = Math.max(0, ts.current.findIndex((x) => x >= cut))
          setEst(estimateBpm(ts.current.slice(k0), gs.current.slice(k0)))
        }
      }
      if (el >= 20) { const fin = estimateBpm(ts.current, gs.current); setEst(fin); if (fin.bpm != null) emit('camera', fin.bpm); stop(); setState('done'); return }
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  const startCam = async () => {
    ts.current = []; gs.current = []; setTrace([]); setEst({ bpm: null, quality: 0 }); setErr('')
    if (!navigator.mediaDevices?.getUserMedia) { setState('error'); setErr('No camera API in this browser or page (needs HTTPS and camera permission).'); return }
    setState('starting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      stream.current = s
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
      setState('live'); loop(performance.now(), false)
    } catch (e) {
      setState('error'); setErr((e as Error).name === 'NotAllowedError' ? 'Camera permission was declined or blocked by this page.' : 'No camera available here.')
    }
  }
  const startSim = () => { ts.current = []; gs.current = []; setTrace([]); setEst({ bpm: null, quality: 0 }); setState('sim'); loop(performance.now(), true) }
  const q = est.quality
  return (
    <Panel title="Camera pulse estimate" kicker="Contact-free · demo-grade" right={<><Illustrative text="Demo-grade estimate, not clinical" /><span className="chip border-white/10 text-ink-mute"><Lock size={11} /> On-device</span></>}>
      <p className="text-xs text-ink-soft">Remote photoplethysmography: each heartbeat slightly changes skin colour. HALO averages the green channel over your forehead and finds the dominant rhythm between 45 and 180 bpm. Frames are processed in memory and never stored or sent.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-space-950">
          <video ref={video} className={`h-full w-full scale-x-[-1] object-cover ${state === 'live' ? '' : 'hidden'}`} muted playsInline aria-label="Camera preview" />
          {state === 'live' && <div className="absolute left-[34%] top-[12%] h-[21%] w-[32%] rounded-lg border-2 border-teal/80" aria-hidden />}
          {state !== 'live' && <div className="flex h-full items-center justify-center text-ink-mute">{state === 'sim' ? <span className="text-xs">Simulated signal</span> : <Camera size={28} aria-hidden />}</div>}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2"><span className="num text-4xl font-semibold">{est.bpm ?? '—'}</span><span className="text-sm text-ink-mute">bpm</span>
            {(state === 'live' || state === 'sim') && <span className="num ml-auto text-xs text-ink-mute">{left}s</span>}</div>
          <div className="mt-1 text-xs"><span className="text-ink-mute">Signal quality </span><span className={q > 0.5 ? 'text-ok' : q > 0.25 ? 'text-warn' : 'text-alert'}>{est.bpm == null ? '—' : q > 0.5 ? 'good' : q > 0.25 ? 'fair' : 'low: keep still, face the light'}</span></div>
          <div className="mt-2"><Trace data={trace} /></div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state === 'live' || state === 'sim' || state === 'starting'
          ? <button className="btn-ghost" onClick={() => { stop(); setState('done') }}><Square size={14} aria-hidden /> Stop</button>
          : <button className="btn-primary" onClick={startCam} data-cam><Camera size={15} aria-hidden /> Measure with camera (20 s)</button>}
        {state !== 'live' && state !== 'sim' && <button className="btn-ghost" onClick={startSim} data-cam-sim>Run with simulated signal</button>}
        {state === 'done' && est.bpm != null && <button className="btn-ghost" onClick={() => { h.logValue('hr', est.bpm!); h.pushToast('Heart rate logged', `${est.bpm} bpm from camera estimate (demo-grade).`, 'ok') }}>Log as resting HR</button>}
      </div>
      {state === 'error' && <div className="mt-2 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-xs text-ink-soft" role="status"><CameraOff size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden />{err} You can run the same algorithm on a simulated signal instead.</div>}
      <div className="mt-2 text-[11px] text-ink-mute">Accuracy depends on light, motion and skin tone; always confirm with a cuff or strap.</div>
    </Panel>
  )
}

function BleStrap() {
  const h = useHalo()
  const [state, setState] = useState<'idle' | 'connecting' | 'live' | 'sim' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [hrs, setHrs] = useState<number[]>([])
  const [rrs, setRrs] = useState<number[]>([])
  const dev = useRef<any>(null), iv = useRef<number | null>(null)
  const supported = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth
  const push = (hr: number, rr: number[]) => { setHrs((a) => [...a, hr].slice(-90)); if (rr.length) setRrs((a) => [...a, ...rr].slice(-120)) }
  const disconnect = () => {
    if (iv.current) window.clearInterval(iv.current)
    try { dev.current?.gatt?.disconnect() } catch { /* ignore */ }
    dev.current = null; setState('idle')
  }
  useEffect(() => () => { if (iv.current) window.clearInterval(iv.current); try { dev.current?.gatt?.disconnect() } catch { /* ignore */ } }, [])
  const connect = async () => {
    setErr(''); setHrs([]); setRrs([])
    if (!supported) { setState('error'); setErr('Web Bluetooth is not available in this browser or page (use Chrome or Edge over HTTPS).'); return }
    setState('connecting')
    try {
      const d = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })
      dev.current = d; setName(d.name || 'Heart-rate strap')
      const server = await d.gatt.connect()
      const svc = await server.getPrimaryService('heart_rate')
      const ch = await svc.getCharacteristic('heart_rate_measurement')
      await ch.startNotifications()
      ch.addEventListener('characteristicvaluechanged', (e: any) => { const r = parseHrm(e.target.value as DataView); push(r.hr, r.rr) })
      d.addEventListener('gattserverdisconnected', () => setState('idle'))
      setState('live')
    } catch (e) {
      setState('error'); setErr((e as Error).name === 'NotFoundError' ? 'No strap selected.' : 'Could not connect (Bluetooth blocked here or strap not in range).')
    }
  }
  const simulate = () => {
    setErr(''); setHrs([]); setRrs([]); setName('Simulated strap'); setState('sim')
    const r = mulberry32(7); let k = 0
    iv.current = window.setInterval(() => {
      k++
      const base = 60 + 3 * Math.sin(k / 9)
      const rr = Array.from({ length: 1 }, () => 60000 / base + gauss(r) * 25)
      push(Math.round(base + gauss(r) * 0.8), rr)
    }, 1000)
  }
  const cur = hrs.at(-1)
  const sorted = [...hrs].sort((a, b) => a - b)
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  useEffect(() => { if (med != null && hrs.length >= 10 && hrs.length % 10 === 0) emit('strap', med) }, [med, hrs.length])
  const hrv = rmssd(rrs)
  return (
    <Panel title="Bluetooth heart-rate strap" kicker="Standard GATT Heart Rate service" right={<Prov ids={['hrpRisks']} />}>
      <p className="text-xs text-ink-soft">Pairs with any chest strap or watch that broadcasts the standard Bluetooth Heart Rate service. HALO reads beats and beat-to-beat (RR) intervals to give live heart rate and HRV (RMSSD).</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.07] p-3"><div className="label">Live HR</div><div className="num mt-1 text-3xl font-semibold">{cur ?? '—'}</div><div className="text-[11px] text-ink-mute">bpm</div></div>
        <div className="rounded-2xl border border-white/[0.07] p-3"><div className="label">Median</div><div className="num mt-1 text-3xl font-semibold">{med ?? '—'}</div><div className="text-[11px] text-ink-mute">bpm · {hrs.length} s</div></div>
        <div className="rounded-2xl border border-white/[0.07] p-3"><div className="label">HRV RMSSD</div><div className="num mt-1 text-3xl font-semibold">{hrv ?? '—'}</div><div className="text-[11px] text-ink-mute">ms</div></div>
      </div>
      <div className="mt-2"><Trace data={hrs} color="#F43F5E" /></div>
      <div className="mt-2 flex flex-wrap gap-2">
        {state === 'live' || state === 'sim'
          ? <button className="btn-ghost" onClick={disconnect}><BluetoothOff size={15} aria-hidden /> Disconnect {name}</button>
          : <button className="btn-primary" onClick={connect} disabled={state === 'connecting'} data-ble><Bluetooth size={15} aria-hidden />{state === 'connecting' ? 'Choose your strap…' : 'Connect strap'}</button>}
        {state !== 'live' && state !== 'sim' && <button className="btn-ghost" onClick={simulate} data-ble-sim>Use simulated strap</button>}
        {med != null && hrs.length >= 10 && <button className="btn-ghost" onClick={() => { h.logValue('hr', med); h.pushToast('Heart rate logged', `${med} bpm median from ${name}.`, 'ok') }} data-ble-log>Log median as resting HR</button>}
      </div>
      {state === 'error' && <div className="mt-2 rounded-xl border border-warn/30 bg-warn/[0.06] p-2.5 text-xs text-ink-soft" role="status">{err} The simulated strap shows the same flow.</div>}
      {state === 'sim' && <div className="mt-2"><Illustrative text="Simulated strap data" /></div>}
    </Panel>
  )
}
