import { describe, expect, it } from 'vitest'
import { estimateBpm, parseHrm, rmssd } from '../views/Sensors'

describe('camera pulse estimator', () => {
  it('recovers a 72 bpm rhythm from a noisy 30 fps trace', () => {
    const t: number[] = [], v: number[] = []
    let seed = 1
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5 }
    for (let i = 0; i < 600; i++) { const ms = i * (1000 / 30); t.push(ms); v.push(100 + Math.sin(2 * Math.PI * 1.2 * ms / 1000) + 0.3 * Math.sin(2 * Math.PI * 0.1 * ms / 1000) + rnd() * 0.6) }
    const r = estimateBpm(t, v)
    expect(r.bpm).toBeGreaterThanOrEqual(70)
    expect(r.bpm).toBeLessThanOrEqual(74)
    expect(r.quality).toBeGreaterThan(0.3)
  })
  it('refuses to estimate from too little data', () => {
    expect(estimateBpm([0, 1, 2], [1, 2, 3]).bpm).toBeNull()
  })
})

describe('Bluetooth heart-rate measurement parsing', () => {
  it('parses 8-bit HR with RR intervals', () => {
    const b = new DataView(new Uint8Array([0x10, 64, 0x00, 0x04, 0x10, 0x04]).buffer) // RR 1024/1024 s, 1040/1024 s
    const r = parseHrm(b)
    expect(r.hr).toBe(64)
    expect(r.rr[0]).toBeCloseTo(1000)
    expect(r.rr).toHaveLength(2)
  })
  it('parses 16-bit HR with energy expended field', () => {
    const b = new DataView(new Uint8Array([0x09, 0x2c, 0x01, 0x10, 0x00]).buffer)
    expect(parseHrm(b).hr).toBe(300)
  })
  it('RMSSD', () => {
    expect(rmssd([1000, 1010, 990, 1000])).toBe(14)
    expect(rmssd([1000])).toBeNull()
  })
})

import { blandAltman, hrTolerance } from './agreement'
describe('Bland–Altman agreement', () => {
  it('computes bias and 95% limits of agreement', () => {
    const r = blandAltman([{ a: 62, b: 60 }, { a: 70, b: 70 }, { a: 81, b: 80 }, { a: 59, b: 60 }])!
    expect(r.bias).toBeCloseTo(0.5, 5)
    expect(r.sd).toBeCloseTo(1.2910, 3)
    expect(r.loaHigh).toBeCloseTo(0.5 + 1.96 * 1.2910, 2)
    expect(r.withinSpec).toBe(1)
  })
  it('ANSI tolerance is the greater of 5 bpm or 10%', () => {
    expect(hrTolerance(40)).toBe(5)
    expect(hrTolerance(120)).toBe(12)
  })
  it('needs at least 2 pairs', () => { expect(blandAltman([{ a: 1, b: 1 }])).toBeNull() })
})
