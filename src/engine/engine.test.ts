import { bpCategory, classify, phq2Positive, PVT_B } from '../data/clinical'
import { describe, expect, it } from 'vitest'
import { analyze, mad, median, populationFlags, robustScale, slopeAt } from './drift'
import { runTriage, DEFAULT_MEDKIT } from './triage'
import { chain, verify } from './blackbox'
import { sha256 } from './sha256'
import { crewHealthIndex, forecast } from './insights'
import { runSimLab } from './simlab'
import { simulateMission, SPE_DAY, WATCH_DAY, idxOf, cumulativeDose, dayOfDate } from '../sim/mission'
import { analyzeMission, detections } from './analysis'
import donki from '../data/donki.json'

const flat = (n: number, v: number, jitter = 0) => Array.from({ length: n }, (_, i) => v + (i % 2 ? jitter : -jitter))

describe('robust statistics', () => {
  it('median and MAD', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(mad([1, 1, 2, 2, 4, 6, 9])).toBe(1)
  })
  it('scale respects the floor', () => {
    expect(robustScale([5, 5, 5, 5], 0.3)).toBe(0.3)
  })
  it('slope of a line', () => {
    expect(slopeAt([1, 2, 3, 4, 5, 6, 7], 6)).toBeCloseTo(1)
    expect(slopeAt([null, null, 1], 2)).toBeNull()
  })
})

describe('drift engine', () => {
  const pre = 21
  it('stays ok on stable data', () => {
    const v = flat(pre + 60, 7.2, 0.1)
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r.some((x) => x.state === 'drift')).toBe(false)
  })
  it('flags a persistent drop only after the persistence window', () => {
    const v = flat(pre + 40, 7.2, 0.1)
    for (let i = pre + 20; i < pre + 40; i++) v[i] = 6.0
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r[pre + 20].state).toBe('watch')
    expect(r[pre + 21].state).toBe('watch')
    expect(r[pre + 22].state).toBe('drift')
  })
  it('ignores single-day spikes (noise)', () => {
    const v = flat(pre + 40, 7.2, 0.1)
    v[pre + 20] = 5.0
    v[pre + 25] = 5.0
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r.some((x) => x.state === 'drift')).toBe(false)
  })
  it('respects the concern direction', () => {
    const v = flat(pre + 30, 7.2, 0.1)
    for (let i = pre + 15; i < pre + 30; i++) v[i] = 9.0 // more sleep is not concerning
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r.some((x) => x.state === 'drift' || x.state === 'watch')).toBe(false)
  })
  it('does not escalate during the adaptation window', () => {
    const v = flat(pre + 30, 7.2, 0.1)
    for (let i = pre; i < pre + 6; i++) v[i] = 5.5
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r.slice(pre, pre + 6).every((x) => x.state === 'adapt')).toBe(true)
  })
  it('missing days neither break nor extend a streak', () => {
    const v: (number | null)[] = flat(pre + 30, 7.2, 0.1)
    v[pre + 15] = 6.0; v[pre + 16] = null; v[pre + 17] = 6.0; v[pre + 18] = 6.0
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r[pre + 16].state).toBe('nodata')
    expect(r[pre + 18].state).toBe('drift')
  })
  it('does not absorb a drift into the rolling baseline', () => {
    const v = flat(pre + 80, 7.2, 0.1)
    for (let i = pre + 20; i < pre + 80; i++) v[i] = 6.0
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r[pre + 79].state).toBe('drift')
    expect(r[pre + 79].center).toBeGreaterThan(7.0)
  })
  it('hysteresis: an open drift needs 2 calm days to clear (no flapping)', () => {
    const v = flat(pre + 40, 7.2, 0.1)
    for (let i = pre + 15; i < pre + 20; i++) v[i] = 6.0
    v[pre + 20] = 7.0 // one partly recovered day (z ≈ -0.67): calm 1
    v[pre + 21] = 6.0 // relapse keeps drift open
    const r = analyze(v, { preCount: pre, dir: 'low', floor: 0.3 })
    expect(r[pre + 17].state).toBe('drift')
    expect(r[pre + 20].state).toBe('drift')
    expect(r[pre + 21].state).not.toBe('ok')
    expect(r[pre + 30].state).toBe('ok')
  })
  it('population rule needs the absolute threshold', () => {
    const v = [7, 7, 6, 6, 6, 4.9, 4.8, 4.7]
    expect(populationFlags(v, { low: 5 }, 'low')).toEqual([false, false, false, false, false, false, false, true])
  })
})

describe('triage rules', () => {
  const base = { latest: {}, states: {}, speActive: false, watchActive: false, delaySec: 1, medkit: DEFAULT_MEDKIT }
  it('all clear = self-manage, no ground contact', () => {
    const t = runTriage(base)
    expect(t.level).toBe('self')
    expect(t.contactGround).toBe(false)
  })
  it('fever + high heart rate = urgent and contact ground', () => {
    const t = runTriage({ ...base, latest: { temp: 38.4, hr: 106 } })
    expect(t.level).toBe('urgent')
    expect(t.contactGround).toBe(true)
    expect(t.hits[0].id).toBe('R2-FEVER+HR')
  })
  it('fever alone = monitor', () => {
    expect(runTriage({ ...base, latest: { temp: 38.1, hr: 60 } }).level).toBe('monitor')
  })
  it('SPE = urgent shelter protocol', () => {
    const t = runTriage({ ...base, speActive: true })
    expect(t.level).toBe('urgent')
    expect(t.hits[0].id).toBe('R1-SPE')
  })
  it('sleep drift = monitor', () => {
    expect(runTriage({ ...base, states: { sleep: 'drift' } }).level).toBe('monitor')
  })
  it('long delay switches to autonomous protocol', () => {
    const t = runTriage({ ...base, latest: { temp: 38.5, hr: 104 }, delaySec: 1100 })
    expect(t.autonomous).toBe(true)
    expect(t.groundNote).toMatch(/HALO runs the protocol now/)
  })
  it('medkit-aware: warns when an item is scarce or empty', () => {
    const kit = DEFAULT_MEDKIT.map((m) => (m.id === 'antipyretic' ? { ...m, qty: 0 } : m.id === 'ors' ? { ...m, qty: 2 } : m))
    const t = runTriage({ ...base, latest: { temp: 38.5, hr: 100 }, medkit: kit })
    expect(t.supplyWarnings.some((w) => w.includes('none left'))).toBe(true)
    expect(t.supplyWarnings.some((w) => w.includes('only 2 left'))).toBe(true)
  })
  it('AHA stage 2 BP = monitor; hypertensive crisis = urgent', () => {
    expect(runTriage({ ...base, latest: { sbp: 165, dbp: 95 } }).hits[0].id).toBe('R3-BP-STAGE2')
    expect(runTriage({ ...base, latest: { sbp: 165, dbp: 95 } }).level).toBe('monitor')
    expect(runTriage({ ...base, latest: { sbp: 185, dbp: 100 } }).level).toBe('urgent')
    expect(runTriage({ ...base, latest: { sbp: 150, dbp: 121 } }).level).toBe('urgent')
    expect(runTriage({ ...base, latest: { sbp: 180, dbp: 120 } }).level).toBe('monitor') // crisis is strictly above
  })
  it('NHLBI low BP with tachycardia = urgent', () => {
    expect(runTriage({ ...base, latest: { sbp: 85, dbp: 55, hr: 112 } }).hits[0].id).toBe('R3-BP-LOW')
  })
  it('ADA glucose levels', () => {
    expect(runTriage({ ...base, latest: { glucose: 50 } }).level).toBe('urgent')
    expect(runTriage({ ...base, latest: { glucose: 62 } }).level).toBe('monitor')
    expect(runTriage({ ...base, latest: { glucose: 70 } }).hits.length).toBe(0)
    expect(runTriage({ ...base, latest: { glucose: 190 } }).level).toBe('monitor')
    expect(runTriage({ ...base, latest: { glucose: 260 } }).level).toBe('urgent')
  })
})

describe('clinical classification (published guidelines)', () => {
  it('AHA blood pressure categories', () => {
    expect(bpCategory(118, 76)?.label).toBe('Normal')
    expect(bpCategory(124, 78)?.label).toBe('Elevated')
    expect(bpCategory(132, 78)?.label).toBe('Stage 1 hypertension')
    expect(bpCategory(118, 84)?.label).toBe('Stage 1 hypertension')
    expect(bpCategory(142, 70)?.label).toBe('Stage 2 hypertension')
    expect(bpCategory(181, 90)?.label).toBe('Hypertensive crisis')
    expect(bpCategory(88, 58)?.label).toMatch(/Low/)
  })
  it('CDC fever, ADA glucose, AASM sleep, PHQ-2', () => {
    expect(classify('temp', 38.0)?.tone).toBe('bad')
    expect(classify('temp', 37.9)?.tone).toBe('ok')
    expect(classify('glucose', 53)?.label).toMatch(/Level 2 low/)
    expect(classify('glucose', 69)?.label).toMatch(/Level 1 low/)
    expect(classify('glucose', 180)?.tone).toBe('ok')
    expect(classify('sleep', 6)?.tone).toBe('warn')
    expect(classify('sleep', 7)?.tone).toBe('ok')
    expect(phq2Positive(3)).toBe(true)
    expect(phq2Positive(2)).toBe(false)
    expect(PVT_B.lapseMs).toBe(355)
  })
})

describe('black box hash chain', () => {
  it('sha256 known vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  it('verifies an intact chain and detects tampering', () => {
    const c = chain([
      { day: 1, type: 'reading', crewId: 'x', summary: 'a' },
      { day: 2, type: 'flag', crewId: 'x', summary: 'b' },
      { day: 3, type: 'action', crewId: 'x', summary: 'c' },
    ])
    expect(verify(c).ok).toBe(true)
    const t = c.map((e) => ({ ...e }))
    t[1].summary = 'edited'
    const v = verify(t)
    expect(v.ok).toBe(false)
    expect(v.brokenAt).toBe(1)
  })
})

describe('insights', () => {
  it('CHI is 100 when all ok and drops with drift', () => {
    expect(crewHealthIndex({ hr: 'ok' }, { speActive: false, urgent: false }).score).toBe(100)
    expect(crewHealthIndex({ sleep: 'drift' }, { speActive: false, urgent: false }).score).toBeLessThan(90)
  })
  it('forecast returns 7 future points with a band', () => {
    const v = Array.from({ length: 40 }, (_, i) => 7 - i * 0.02)
    const res = analyze(v, { preCount: 21, dir: 'low', floor: 0.3 })
    const f = forecast(res, 39, 'sleep')
    const fut = f.points.filter((p) => p.base != null)
    expect(fut).toHaveLength(7)
    expect(fut.every((p) => (p.lo as number) <= (p.base as number) && (p.base as number) <= (p.hi as number))).toBe(true)
  })
})

describe('scenario (seeded, repeatable)', () => {
  const m1 = simulateMission(), m2 = simulateMission()
  it('is deterministic', () => {
    expect(JSON.stringify(m1.series)).toBe(JSON.stringify(m2.series))
  })
  it('maps real DONKI dates onto mission days', () => {
    expect(WATCH_DAY).toBe(84)
    expect(SPE_DAY).toBe(90)
    expect(dayOfDate('2024-02-21T00:00Z')).toBe(1)
  })
  it('scenario events reference real DONKI records', () => {
    const ids = new Set([...donki.flr.map((f: any) => f.id), ...donki.cme.map((c: any) => c.id)])
    for (const id of ['2024-05-14T16:46:00-FLR-001', '2024-05-14T17:00:00-CME-001', '2024-05-20T05:36:00-CME-001']) expect(ids.has(id)).toBe(true)
    const x87 = donki.flr.find((f: any) => f.id === '2024-05-14T16:46:00-FLR-001') as any
    expect(x87.cls).toBe('X8.7')
  })
  it('HALO catches Leila’s sleep drift well before the population rule', () => {
    const a = analyzeMission(m1)
    const ev = detections(m1, a).filter((e) => e.crewId === 'leila' && e.indicator === 'sleep' && e.personalDay > 30 && e.personalDay < 70)
    expect(ev.length).toBeGreaterThan(0)
    const first = ev[0]
    expect(first.personalDay).toBeLessThan(55)
    if (first.populationDay != null) expect(first.leadDays as number).toBeGreaterThanOrEqual(7)
  })
  it('fever produces urgent triage on day 157', () => {
    const a = analyzeMission(m1)
    const i = idxOf(157)
    const t = runTriage({ latest: { temp: m1.series.leila.temp[i], hr: m1.series.leila.hr[i] }, states: { hr: a.leila.hr[i].state }, speActive: false, watchActive: false, delaySec: 1100, medkit: DEFAULT_MEDKIT })
    expect(t.level).toBe('urgent')
  })
  it('dose ledger stays well under the 600 mSv career limit and SPE under 250 mSv', () => {
    const total = cumulativeDose(m1, 180)
    expect(total).toBeGreaterThan(300)
    expect(total).toBeLessThan(600)
    expect(m1.dose[SPE_DAY - 1]).toBeLessThan(250)
  })
})

describe('simulation lab', () => {
  it('is deterministic and reports both methods', () => {
    const a = runSimLab(7, 200), b = runSimLab(7, 200)
    expect(a.detectedPersonal).toBe(b.detectedPersonal)
    expect(a.detectedPersonal).toBeGreaterThan(a.detectedPopulation)
    expect(a.driftRuns).toBeGreaterThan(50)
  })
})
