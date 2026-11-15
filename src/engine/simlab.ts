// Mission Simulation Lab: 1,000 seeded synthetic missions comparing HALO's personal-baseline drift
// detection with a fixed population threshold. Results are SENSITIVITY UNDER STATED ASSUMPTIONS, not proof.
import { gauss, mulberry32 } from '../sim/prng'
import { analyze, populationFlags, SCALE_FLOOR } from './drift'

export const SIMLAB_ASSUMPTIONS = {
  indicator: 'Sleep (hours)',
  runs: 1000,
  days: 180,
  preDays: 21,
  baselineMean: { mean: 7.0, sd: 0.55 }, // personal habitual sleep across simulated people
  dailyNoiseSd: { min: 0.22, max: 0.45 },
  driftShare: 0.5, // half the missions contain a true decline, half are controls
  driftOnset: [25, 140],
  driftDepth: [1.2, 2.6], // hours lost at the bottom of the decline
  driftLength: [18, 35], // days to reach the bottom
  missingRate: 0.03,
  populationThreshold: 5.0, // illustrative fixed cut-off (h)
  persistence: 3,
}

export interface SimRun { drift: boolean; onset: number | null; personal: number | null; population: number | null; falsePersonal: number; falsePopulation: number; baseline: number }
export interface SimSummary {
  runs: SimRun[]
  detectedPersonal: number; detectedPopulation: number; driftRuns: number
  medianLead: number | null; meanLead: number | null
  falseAlarmPersonal: number; falseAlarmPopulation: number // per 100 crew-days in control missions
  leadHistogram: { bin: string; count: number }[]
  missedByPopulation: number
}

export function runSimLab(seed = 7, runs = SIMLAB_ASSUMPTIONS.runs): SimSummary {
  const A = SIMLAB_ASSUMPTIONS
  const r = mulberry32(seed)
  const uni = (a: number, b: number) => a + (b - a) * r()
  const out: SimRun[] = []
  for (let k = 0; k < runs; k++) {
    const baseline = A.baselineMean.mean + gauss(r) * A.baselineMean.sd
    const sd = uni(A.dailyNoiseSd.min, A.dailyNoiseSd.max)
    const drift = r() < A.driftShare
    const onset = drift ? Math.round(uni(A.driftOnset[0], A.driftOnset[1])) : null
    const depth = uni(A.driftDepth[0], A.driftDepth[1])
    const len = uni(A.driftLength[0], A.driftLength[1])
    const vals: (number | null)[] = []
    for (let i = 0; i < A.preDays + A.days; i++) {
      const d = i - A.preDays + 1
      const dec = onset != null && d >= onset ? Math.min(1, (d - onset) / len) * depth : 0
      vals.push(r() < A.missingRate && d > 0 ? null : baseline - dec + gauss(r) * sd)
    }
    const res = analyze(vals, { preCount: A.preDays, dir: 'low', floor: SCALE_FLOOR.sleep })
    const pop = populationFlags(vals, { low: A.populationThreshold }, 'low', A.persistence)
    const startIdx = A.preDays + 10 // ignore adaptation window equally for both methods
    const onIdx = onset != null ? onset + A.preDays - 1 : null
    let personal: number | null = null, population: number | null = null, fp = 0, fpop = 0
    for (let i = startIdx; i < vals.length; i++) {
      const pf = res[i].state === 'drift', qf = pop[i]
      if (onIdx == null || i < onIdx) { if (pf) fp++; if (qf) fpop++ }
      else {
        if (pf && personal == null) personal = i - A.preDays + 1
        if (qf && population == null) population = i - A.preDays + 1
      }
    }
    out.push({ drift, onset, personal, population, falsePersonal: fp, falsePopulation: fpop, baseline })
  }
  const dr = out.filter((x) => x.drift)
  const leads = dr.filter((x) => x.personal != null && x.population != null).map((x) => (x.population as number) - (x.personal as number))
  const sorted = [...leads].sort((a, b) => a - b)
  const ctrlDays = out.filter((x) => !x.drift).length * (A.days - 10)
  const bins = [[-99, -1, '< 0'], [0, 4, '0–4'], [5, 9, '5–9'], [10, 14, '10–14'], [15, 19, '15–19'], [20, 29, '20–29'], [30, 999, '30+']] as const
  return {
    runs: out,
    driftRuns: dr.length,
    detectedPersonal: dr.filter((x) => x.personal != null).length,
    detectedPopulation: dr.filter((x) => x.population != null).length,
    missedByPopulation: dr.filter((x) => x.personal != null && x.population == null).length,
    medianLead: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    meanLead: leads.length ? Math.round((leads.reduce((a, b) => a + b, 0) / leads.length) * 10) / 10 : null,
    falseAlarmPersonal: ctrlDays ? Math.round((out.reduce((a, x) => a + (x.drift ? 0 : x.falsePersonal), 0) / ctrlDays) * 10000) / 100 : 0,
    falseAlarmPopulation: ctrlDays ? Math.round((out.reduce((a, x) => a + (x.drift ? 0 : x.falsePopulation), 0) / ctrlDays) * 10000) / 100 : 0,
    leadHistogram: bins.map(([lo, hi, bin]) => ({ bin, count: leads.filter((l) => l >= lo && l <= hi).length })),
  }
}
