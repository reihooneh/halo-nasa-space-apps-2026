// Bland–Altman agreement analysis between two measurement methods (e.g. camera pulse vs chest strap).
// Acceptance band: ANSI/AAMI heart-rate meter accuracy, readout error within ±10% or ±5 bpm, whichever is greater.

export interface Pair { a: number; b: number; label?: string }
export interface Agreement {
  n: number; bias: number; sd: number; loaLow: number; loaHigh: number
  mae: number; mape: number; withinSpec: number; points: { mean: number; diff: number; ok: boolean }[]
}

export const hrTolerance = (ref: number) => Math.max(5, 0.1 * ref)

/** a = method under test, b = reference. diff = a − b. */
export function blandAltman(pairs: Pair[]): Agreement | null {
  const n = pairs.length
  if (n < 2) return null
  const diffs = pairs.map((p) => p.a - p.b)
  const bias = diffs.reduce((s, d) => s + d, 0) / n
  const sd = Math.sqrt(diffs.reduce((s, d) => s + (d - bias) ** 2, 0) / (n - 1))
  const points = pairs.map((p) => ({ mean: (p.a + p.b) / 2, diff: p.a - p.b, ok: Math.abs(p.a - p.b) <= hrTolerance(p.b) }))
  return {
    n, bias, sd, loaLow: bias - 1.96 * sd, loaHigh: bias + 1.96 * sd,
    mae: diffs.reduce((s, d) => s + Math.abs(d), 0) / n,
    mape: (100 * pairs.reduce((s, p) => s + Math.abs(p.a - p.b) / p.b, 0)) / n,
    withinSpec: points.filter((p) => p.ok).length / n,
    points,
  }
}
