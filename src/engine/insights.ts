// Crew Health Index, forecast, confidence. All weights/models are ILLUSTRATIVE and explained in the UI.
import { IND, INDICATORS, type IndicatorId } from '../data/domain'
import type { DayResult, DriftState } from './drift'

export interface ChiPart { label: string; delta: number; indicator?: IndicatorId }
export interface Chi { score: number; parts: ChiPart[]; band: 'nominal' | 'watch' | 'action' }

const WEIGHT: Record<IndicatorId, number> = { hr: 1, sbp: 1, dbp: 0.6, temp: 1.4, glucose: 0.8, sleep: 1.2, mood: 1.2, exercise: 0.8, pvt: 1 }

export function crewHealthIndex(states: Partial<Record<IndicatorId, DriftState>>, opts: { speActive: boolean; urgent: boolean }): Chi {
  const parts: ChiPart[] = []
  for (const ind of INDICATORS) {
    const s = states[ind.id]
    if (s === 'drift') parts.push({ label: `${ind.short} drift`, delta: -Math.round(10 * WEIGHT[ind.id]), indicator: ind.id })
    else if (s === 'watch') parts.push({ label: `${ind.short} watch`, delta: -Math.round(4 * WEIGHT[ind.id]), indicator: ind.id })
    else if (s === 'nodata') parts.push({ label: `${ind.short} not logged`, delta: -2, indicator: ind.id })
  }
  if (opts.speActive) parts.push({ label: 'Solar particle event', delta: -15 })
  if (opts.urgent) parts.push({ label: 'Urgent triage open', delta: -10 })
  const score = Math.max(0, Math.min(100, 100 + parts.reduce((a, p) => a + p.delta, 0)))
  return { score, parts, band: score >= 85 ? 'nominal' : score >= 65 ? 'watch' : 'action' }
}

export interface ForecastPoint { day: number; actual?: number | null; base?: number; lo?: number; hi?: number; cm?: number; center?: number }

export interface WhatIf { sleepHours: number; exerciseMin: number; adherence: number }

/** Coupling coefficients for what-if (illustrative): how +1 h sleep / +30 min exercise shift other indicators. */
export const COUPLING = { sleepToPvt: -14, sleepToMood: 0.3, sleepToHr: -1.2, exToGlucose: -1.5 }

export function forecast(res: DayResult[], todayIdx: number, ind: IndicatorId, horizon = 7, what?: WhatIf): { points: ForecastPoint[]; slope: number; sd: number } {
  const hist = res.slice(Math.max(0, todayIdx - 13), todayIdx + 1).filter((r) => r.value != null)
  const xs = hist.map((r) => r.index), ys = hist.map((r) => r.value as number)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / Math.max(1, n), my = ys.reduce((a, b) => a + b, 0) / Math.max(1, n)
  let num = 0, den = 0
  for (let k = 0; k < n; k++) { num += (xs[k] - mx) * (ys[k] - my); den += (xs[k] - mx) ** 2 }
  const slope = den ? num / den : 0
  const resid = ys.map((y, k) => y - (my + slope * (xs[k] - mx)))
  const sd = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / Math.max(1, n - 2)) || res[todayIdx]?.scale || 1
  const center = res[todayIdx]?.center ?? my
  const last = ys.length ? my + slope * (todayIdx - mx) : center
  const shift = whatIfShift(ind, what)
  const adherence = what?.adherence ?? 1
  const points: ForecastPoint[] = []
  for (let k = Math.max(0, todayIdx - 13); k <= todayIdx; k++) points.push({ day: k, actual: res[k]?.value ?? null, center: res[k]?.center })
  for (let h = 1; h <= horizon; h++) {
    const i = todayIdx + h
    const base = last + slope * h
    const w = sd * 1.96 * Math.sqrt(1 + h / Math.max(3, n))
    // Countermeasure scenario: exponential return toward personal baseline (tau 4 days) plus what-if shift.
    const cm = center + (last - center) * Math.exp(-(h * adherence) / 4) + shift * (1 - Math.exp(-h / 2))
    points.push({ day: i, base, lo: base - w, hi: base + w, cm, center })
  }
  const dec = IND[ind].decimals
  for (const p of points) for (const k of ['base', 'lo', 'hi', 'cm'] as const) if (p[k] != null) p[k] = Number((p[k] as number).toFixed(dec + 1))
  return { points, slope, sd }
}

function whatIfShift(ind: IndicatorId, w?: WhatIf): number {
  if (!w) return 0
  const s = w.sleepHours, e = w.exerciseMin / 30
  switch (ind) {
    case 'sleep': return s
    case 'pvt': return COUPLING.sleepToPvt * s
    case 'mood': return COUPLING.sleepToMood * s
    case 'hr': return COUPLING.sleepToHr * s
    case 'exercise': return w.exerciseMin
    case 'glucose': return COUPLING.exToGlucose * e
    default: return 0
  }
}

export interface Confidence { level: 'high' | 'medium' | 'low'; missing: number; window: number; reasons: string[]; escalate: string }

export function confidenceOf(res: DayResult[], todayIdx: number, preCount: number): Confidence {
  const window = 7
  const slice = res.slice(Math.max(0, todayIdx - window + 1), todayIdx + 1)
  const missing = slice.filter((r) => r.value == null).length
  const preN = res.slice(0, preCount).filter((r) => r.value != null).length
  const reasons: string[] = []
  if (preN < 10) reasons.push(`Only ${preN} pre-flight baseline days`)
  if (missing) reasons.push(`${missing} of last ${window} days not logged`)
  const today = res[todayIdx]
  if (today?.cz != null && today.cz < 2.5 && today.state === 'drift') reasons.push('Deviation is modest (z < 2.5)')
  const level = preN < 10 || missing >= 3 ? 'low' : missing >= 1 || reasons.length ? 'medium' : 'high'
  return {
    level, missing, window, reasons: reasons.length ? reasons : ['Complete recent data and a full pre-flight baseline'],
    escalate: 'Escalate to a human (commander or flight surgeon) if HALO says Urgent, if you feel unwell regardless of what HALO shows, or if confidence is low and the trend keeps worsening.',
  }
}
