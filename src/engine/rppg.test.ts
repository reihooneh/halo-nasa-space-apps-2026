import { describe, expect, it } from 'vitest'
import { estimatePulse, estimatePulse1, parseHrmFull, rmssdClean, resample } from './rppg'
import { gauss, mulberry32 } from '../sim/prng'

/** Synthetic skin trace: pulse on the blood-volume colour vector + light drift + motion steps + sensor noise, jittered frame times. */
function synth(bpm: number, seed: number, opts: { fps?: number; amp?: number; noise?: number; motion?: boolean; secs?: number } = {}) {
  const { fps = 30, amp = 0.006, noise = 0.002, motion = true, secs = 20 } = opts
  const rnd = mulberry32(seed)
  const t: number[] = [], r: number[] = [], g: number[] = [], b: number[] = []
  let tt = 0
  for (let i = 0; i < secs * fps; i++) {
    tt += (1000 / fps) * (1 + (rnd() - 0.5) * 0.3)
    const s = tt / 1000
    const pulse = Math.sin(2 * Math.PI * (bpm / 60) * s) + 0.3 * Math.sin(4 * Math.PI * (bpm / 60) * s)
    const light = 1 + 0.04 * Math.sin(2 * Math.PI * 0.13 * s) + (motion && s > 8 && s < 9 ? 0.05 : 0)
    t.push(tt)
    r.push(200 * light * (1 + 0.33 * amp * pulse + gauss(rnd) * noise))
    g.push(150 * light * (1 + 0.77 * amp * pulse + gauss(rnd) * noise))
    b.push(120 * light * (1 + 0.53 * amp * pulse + gauss(rnd) * noise))
  }
  return { t, r, g, b }
}

describe('camera pulse (POS)', () => {
  it.each([48, 54, 60, 66, 72, 78, 84, 96, 108, 120, 150])('recovers %i bpm within 2 bpm despite light drift and a motion step', (bpm) => {
    const s = synth(bpm, bpm)
    const e = estimatePulse(s.t, s.r, s.g, s.b)
    expect(Math.abs((e.bpm as number) - bpm)).toBeLessThanOrEqual(2)
    expect(e.quality).toBeGreaterThan(0.3)
  })
  it('works at 15 fps and with weaker pulse', () => {
    const s = synth(70, 5, { fps: 15, amp: 0.004 })
    expect(Math.abs((estimatePulse(s.t, s.r, s.g, s.b).bpm as number) - 70)).toBeLessThanOrEqual(2)
  })
  it('POS beats green-only when the light flickers', () => {
    const s = synth(66, 9, { noise: 0.002 })
    const flick = s.t.map((tt) => 1 + 0.03 * Math.sin(2 * Math.PI * 1.9 * (tt / 1000))) // 114/min light flicker on all channels
    const r = s.r.map((v, i) => v * flick[i]), g = s.g.map((v, i) => v * flick[i]), b = s.b.map((v, i) => v * flick[i])
    expect(Math.abs((estimatePulse(s.t, r, g, b).bpm as number) - 66)).toBeLessThanOrEqual(2)
    expect(estimatePulse1(s.t, g).bpm).toBe(114)
  })
  it('reports low quality on pure noise and null on too little data', () => {
    const s = synth(70, 3, { amp: 0 })
    expect(estimatePulse(s.t, s.r, s.g, s.b).quality).toBeLessThan(0.35)
    const short = synth(70, 3, { secs: 3 })
    expect(estimatePulse(short.t, short.r, short.g, short.b).bpm).toBeNull()
  })
  it('resamples irregular samples', () => { expect(resample([0, 100, 200], [0, 1, 2], 20)).toEqual([0, 0.5, 1, 1.5, 2]) })
})

describe('Bluetooth heart-rate packets (GATT 0x2A37)', () => {
  const dv = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer)
  it('8-bit HR, contact ok, RR intervals', () => {
    const p = parseHrmFull(dv([0x16, 62, 0x00, 0x04, 0x10, 0x04])) // flags: contact supported+detected, RR present
    expect(p.hr).toBe(62); expect(p.contact).toBe('ok'); expect(p.rr.map(Math.round)).toEqual([1000, 1016])
  })
  it('16-bit HR with energy expended', () => {
    const p = parseHrmFull(dv([0x09, 0x2c, 0x01, 0x10, 0x00]))
    expect(p.hr).toBe(300); expect(p.energyKj).toBe(16); expect(p.contact).toBe('unsupported'); expect(p.rr).toEqual([])
  })
  it('contact lost flag', () => { expect(parseHrmFull(dv([0x04, 0])).contact).toBe('lost') })
  it('RMSSD ignores dropouts and ectopic beats', () => {
    expect(rmssdClean([1000, 1010, 1000, 1010]).rmssd).toBe(10)
    const c = rmssdClean([1000, 1010, 2040, 1000, 1010, 1000])
    expect(c.rmssd).toBe(10); expect(c.dropped).toBe(2)
    expect(rmssdClean([1000]).rmssd).toBeNull()
  })
})
