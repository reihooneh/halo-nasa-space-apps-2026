// HALO Baseline & Drift Engine.
// Personal baseline: robust pre-flight median + MAD, then a slow EWMA "rolling" centre that only
// learns from in-control days (so a real drift is not absorbed into the baseline).
// Flags require persistence (N consecutive concerning days). Thresholds are ILLUSTRATIVE.
import type { Direction, IndicatorId } from '../data/domain'

export const DRIFT_PARAMS = {
  zWatch: 2.0, // robust z for a concerning day (illustrative)
  persistDays: 3, // consecutive concerning days to raise a drift flag (illustrative)
  alpha: 0.04, // EWMA learning rate for the rolling baseline
  adaptationDays: 10, // early in-flight adaptation window: watch only, never escalate
  holdZ: 1.0, // an open drift episode stays open while robust z ≥ this (hysteresis)
  clearDays: 2, // consecutive calm days needed to close a drift episode
}

/** Minimum scale per indicator so tiny MADs don't create false alarms (illustrative). */
export const SCALE_FLOOR: Record<IndicatorId, number> = { hr: 2.5, sbp: 4, dbp: 3, temp: 0.15, glucose: 7, sleep: 0.3, mood: 0.5, exercise: 10, pvt: 10 }

export type DriftState = 'nodata' | 'ok' | 'watch' | 'drift' | 'adapt'

export interface DayResult {
  index: number
  value: number | null
  center: number
  scale: number
  z: number | null
  /** concern-signed z: positive = in the concerning direction */
  cz: number | null
  state: DriftState
  streak: number
  slope7: number | null
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return NaN
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

export function mad(xs: number[]): number {
  const m = median(xs)
  return median(xs.map((x) => Math.abs(x - m)))
}

export function robustScale(xs: number[], floor: number): number {
  return Math.max(1.4826 * mad(xs), floor)
}

export function concernZ(z: number, dir: Direction): number {
  return dir === 'high' ? z : dir === 'low' ? -z : Math.abs(z)
}

/** Least-squares slope over the last n non-null points ending at i (units per day). */
export function slopeAt(values: (number | null)[], i: number, n = 7): number | null {
  const pts: [number, number][] = []
  for (let k = Math.max(0, i - n + 1); k <= i; k++) {
    const v = values[k]
    if (v != null) pts.push([k, v])
  }
  if (pts.length < 3) return null
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const my = pts.reduce((a, p) => a + p[1], 0) / pts.length
  let num = 0, den = 0
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2 }
  return den === 0 ? 0 : num / den
}

export interface AnalyzeOptions {
  preCount: number
  dir: Direction
  floor: number
  /** index of mission day 1 (first in-flight index). Defaults to preCount. */
  flightStart?: number
  params?: Partial<typeof DRIFT_PARAMS>
}

export function analyze(values: (number | null)[], o: AnalyzeOptions): DayResult[] {
  const P = { ...DRIFT_PARAMS, ...(o.params || {}) }
  const pre = values.slice(0, o.preCount).filter((v): v is number => v != null)
  const m0 = pre.length ? median(pre) : (values.find((v) => v != null) ?? 0)
  const scale = pre.length >= 5 ? robustScale(pre, o.floor) : o.floor * 2
  const flightStart = o.flightStart ?? o.preCount
  let center = m0
  let streak = 0
  let episode = false // hysteresis: once in drift, stay until P.clearDays calm days
  let calm = 0
  const out: DayResult[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (i < o.preCount) {
      out.push({ index: i, value: v, center: m0, scale, z: v == null ? null : (v - m0) / scale, cz: null, state: v == null ? 'nodata' : 'ok', streak: 0, slope7: null })
      continue
    }
    if (v == null) {
      // Missing data neither breaks nor extends a streak.
      out.push({ index: i, value: null, center, scale, z: null, cz: null, state: 'nodata', streak, slope7: slopeAt(values, i) })
      continue
    }
    const z = (v - center) / scale
    const cz = concernZ(z, o.dir)
    const concerning = cz >= P.zWatch
    streak = concerning ? streak + 1 : 0
    const inAdapt = i - flightStart < P.adaptationDays
    let state: DriftState = 'ok'
    if (concerning) state = inAdapt ? 'adapt' : streak >= P.persistDays ? 'drift' : 'watch'
    if (state === 'drift') { episode = true; calm = 0 }
    else if (episode) {
      // Hysteresis: an open drift episode only clears after clearDays days back near baseline.
      if (cz >= P.holdZ) { state = 'drift'; calm = 0 }
      else { calm += 1; if (calm >= P.clearDays) episode = false; else state = 'drift' }
    }
    out.push({ index: i, value: v, center, scale, z, cz, state, streak, slope7: slopeAt(values, i) })
    // Learn only from in-control days so drift is not absorbed into the baseline.
    if (!concerning && Math.abs(z) < P.zWatch) center = center + P.alpha * (v - center)
  }
  return out
}

/** Population comparison: fixed threshold, same persistence rule. */
export function populationFlags(values: (number | null)[], pop: { low?: number; high?: number }, dir: Direction, persist = DRIFT_PARAMS.persistDays): boolean[] {
  let streak = 0
  return values.map((v) => {
    if (v == null) return streak >= persist
    const bad = (dir !== 'high' && pop.low != null && v < pop.low) || (dir !== 'low' && pop.high != null && v > pop.high)
    streak = bad ? streak + 1 : 0
    return streak >= persist
  })
}

export function firstIndex<T>(xs: T[], pred: (x: T, i: number) => boolean, from = 0): number {
  for (let i = from; i < xs.length; i++) if (pred(xs[i], i)) return i
  return -1
}
