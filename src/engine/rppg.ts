// Camera pulse (remote photoplethysmography) and Bluetooth heart-rate signal processing. Pure functions, unit-tested.
// Camera method: POS ("plane orthogonal to skin", Wang et al. 2017) on mean R,G,B of a skin region, then a windowed
// spectrum between 42 and 210 bpm. POS is more robust to light and motion changes than the green channel alone.

export interface PulseEstimate { bpm: number | null; quality: number; snrDb: number | null; fps: number }

/** Linear resampling of irregular samples (ms timestamps) to a uniform rate. */
export function resample(t: number[], x: number[], fs: number): number[] {
  const n = Math.min(t.length, x.length)
  if (n < 2) return []
  const out: number[] = []
  const dt = 1000 / fs
  let j = 0
  for (let tt = t[0]; tt <= t[n - 1]; tt += dt) {
    while (j < n - 2 && t[j + 1] < tt) j++
    const span = t[j + 1] - t[j] || 1
    const a = Math.min(1, Math.max(0, (tt - t[j]) / span))
    out.push(x[j] + (x[j + 1] - x[j]) * a)
  }
  return out
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1)
const std = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length || 1)) }

/** POS pulse signal from uniformly sampled mean R,G,B traces. */
export function posSignal(r: number[], g: number[], b: number[], fs: number): number[] {
  const n = Math.min(r.length, g.length, b.length)
  const l = Math.max(8, Math.round(1.6 * fs))
  const H = new Array<number>(n).fill(0)
  for (let s = 0; s + l <= n; s++) {
    let mr = 0, mg = 0, mb = 0
    for (let i = s; i < s + l; i++) { mr += r[i]; mg += g[i]; mb += b[i] }
    mr /= l; mg /= l; mb /= l
    if (mr <= 0 || mg <= 0 || mb <= 0) continue
    const s1: number[] = [], s2: number[] = []
    for (let i = s; i < s + l; i++) { const R = r[i] / mr, G = g[i] / mg, B = b[i] / mb; s1.push(G - B); s2.push(-2 * R + G + B) }
    const sd2 = std(s2)
    const alpha = sd2 > 1e-12 ? std(s1) / sd2 : 0
    const h = s1.map((v, i) => v + alpha * s2[i])
    const mh = mean(h)
    for (let i = 0; i < l; i++) H[s + i] += h[i] - mh
  }
  return H
}

/** Remove slow drift with a centred moving average of `win` samples. */
export function detrend(x: number[], win: number): number[] {
  const n = x.length, half = Math.max(1, Math.floor(win / 2))
  const pre = [0]
  for (let i = 0; i < n; i++) pre.push(pre[i] + x[i])
  return x.map((v, i) => { const a = Math.max(0, i - half), b = Math.min(n, i + half + 1); return v - (pre[b] - pre[a]) / (b - a) })
}

/** Dominant rhythm of a uniformly sampled signal in [fLo, fHi] Hz, with a signal-to-noise quality score. */
export function spectrumPeak(x: number[], fs: number, fLo = 0.7, fHi = 3.5): { f: number | null; quality: number; snrDb: number | null } {
  const n = x.length
  if (n < fs * 5) return { f: null, quality: 0, snrDb: null }
  const d = detrend(x, Math.round(fs * 1.2))
  const sd = std(d)
  if (!(sd > 0)) return { f: null, quality: 0, snrDb: null }
  const w = d.map((v, i) => (v / sd) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))))
  const df = 0.01
  const fs_: number[] = [], ps: number[] = []
  for (let f = fLo - 0.1; f <= 2 * fHi + 0.1; f += df) {
    let re = 0, im = 0
    const k = (2 * Math.PI * f) / fs
    for (let i = 0; i < n; i++) { re += w[i] * Math.cos(k * i); im += w[i] * Math.sin(k * i) }
    fs_.push(f); ps.push(re * re + im * im)
  }
  let bi = -1
  for (let i = 1; i < ps.length - 1; i++) if (fs_[i] >= fLo && fs_[i] <= fHi && (bi < 0 || ps[i] > ps[bi])) bi = i
  if (bi < 1) return { f: null, quality: 0, snrDb: null }
  // parabolic refinement around the peak
  const a = ps[bi - 1], b = ps[bi], c = ps[bi + 1]
  const off = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0
  const f = fs_[bi] + Math.max(-0.5, Math.min(0.5, off)) * df
  // SNR: power within ±0.12 Hz of the peak and of its first harmonic vs the rest of the band
  let sig = 0, noise = 0
  for (let i = 0; i < ps.length; i++) {
    const near = Math.abs(fs_[i] - f) <= 0.12, harm = Math.abs(fs_[i] - 2 * f) <= 0.12
    if (near || harm) sig += ps[i]
    else if (fs_[i] >= fLo && fs_[i] <= fHi) noise += ps[i]
  }
  const snrDb = noise > 0 ? 10 * Math.log10(sig / noise) : 30
  const quality = Math.max(0, Math.min(1, (snrDb + 4) / 10)) // −4 dB → 0, +6 dB → 1
  return { f, quality, snrDb }
}

/** Full camera pipeline: irregular RGB samples → bpm. Skips the first `settleMs` (auto-exposure settling). */
export function estimatePulse(t: number[], r: number[], g: number[], b: number[], settleMs = 0): PulseEstimate {
  let k0 = 0
  while (k0 < t.length && t[k0] - t[0] < settleMs) k0++
  const tt = t.slice(k0), n = tt.length
  const dur = n > 1 ? (tt[n - 1] - tt[0]) / 1000 : 0
  const fps = dur > 0 ? (n - 1) / dur : 0
  if (n < 60 || dur < 6 || fps < 8) return { bpm: null, quality: 0, snrDb: null, fps }
  const fs = 30
  const R = resample(tt, r.slice(k0), fs), G = resample(tt, g.slice(k0), fs), B = resample(tt, b.slice(k0), fs)
  const p = spectrumPeak(posSignal(R, G, B, fs), fs)
  return { bpm: p.f == null ? null : Math.round(p.f * 60), quality: p.quality, snrDb: p.snrDb, fps }
}

/** Single-channel variant (e.g. green only). */
export function estimatePulse1(t: number[], v: number[]): PulseEstimate {
  const n = Math.min(t.length, v.length)
  const dur = n > 1 ? (t[n - 1] - t[0]) / 1000 : 0
  const fps = dur > 0 ? (n - 1) / dur : 0
  if (n < 60 || dur < 6) return { bpm: null, quality: 0, snrDb: null, fps }
  const p = spectrumPeak(resample(t, v, 30), 30)
  return { bpm: p.f == null ? null : Math.round(p.f * 60), quality: p.quality, snrDb: p.snrDb, fps }
}

/* ---------- Bluetooth Heart Rate Measurement (GATT 0x2A37) ---------- */

export interface HrmPacket { hr: number; rr: number[]; contact: 'ok' | 'lost' | 'unsupported'; energyKj: number | null }

export function parseHrmFull(dv: DataView): HrmPacket {
  const flags = dv.getUint8(0)
  const wide = flags & 0x01
  let o = 1
  const hr = wide ? dv.getUint16(o, true) : dv.getUint8(o)
  o += wide ? 2 : 1
  const contact = flags & 0x04 ? (flags & 0x02 ? 'ok' : 'lost') : 'unsupported'
  let energyKj: number | null = null
  if (flags & 0x08) { if (o + 1 < dv.byteLength) energyKj = dv.getUint16(o, true); o += 2 }
  const rr: number[] = []
  if (flags & 0x10) for (; o + 1 < dv.byteLength; o += 2) rr.push((dv.getUint16(o, true) / 1024) * 1000)
  return { hr, rr, contact, energyKj }
}

/** RMSSD over plausible beats only: RR within 300–2000 ms and successive change under 25% (drops ectopic beats and dropouts). */
export function rmssdClean(rr: number[]): { rmssd: number | null; used: number; dropped: number } {
  let s = 0, used = 0, dropped = 0
  for (let i = 1; i < rr.length; i++) {
    const a = rr[i - 1], b = rr[i]
    if (a < 300 || a > 2000 || b < 300 || b > 2000 || Math.abs(b - a) > 0.25 * a) { dropped++; continue }
    s += (b - a) ** 2; used++
  }
  return { rmssd: used >= 2 ? Math.round(Math.sqrt(s / used)) : null, used, dropped }
}
