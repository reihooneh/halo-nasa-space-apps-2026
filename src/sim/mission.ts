// Seeded, scripted-but-data-driven simulation of a 180-day Mars transit for a 4-person crew.
// ALL CREW DATA IS SIMULATED. Space-weather dates come from real NASA CCMC DONKI records.
import { gauss, hashSeed, mulberry32 } from './prng'
import type { IndicatorId } from '../data/domain'

export const MISSION_DAYS = 180
export const PRE_DAYS = 21 // pre-flight baseline days (-20 .. 0)
/** Mission day 1 = 2024-02-21 UTC so that real May 2024 space weather lands on mission days 71-101. */
export const DAY1_UTC = Date.UTC(2024, 1, 21)

export function dateOfDay(day: number): Date {
  return new Date(DAY1_UTC + (day - 1) * 86400000)
}
export function dayOfDate(iso: string): number {
  const t = Date.parse(iso.endsWith('Z') ? iso : iso + 'Z')
  return Math.floor((t - DAY1_UTC) / 86400000) + 1
}
export function fmtDate(day: number): string {
  return dateOfDay(day).toISOString().slice(0, 10)
}

export interface CrewMember {
  id: string
  name: string
  role: string
  initials: string
  consentShare: boolean
  base: Record<IndicatorId, number>
  sd: Record<IndicatorId, number>
}

export const IND_IDS: IndicatorId[] = ['hr', 'sbp', 'dbp', 'temp', 'glucose', 'sleep', 'mood', 'exercise', 'pvt']

const DECIMALS: Record<IndicatorId, number> = { hr: 0, sbp: 0, dbp: 0, temp: 1, glucose: 0, sleep: 1, mood: 0, exercise: 0, pvt: 0 }

export const CREW: CrewMember[] = [
  { id: 'leila', name: 'Leila Haddad', role: 'Flight Engineer', initials: 'LH', consentShare: true,
    base: { hr: 58, sbp: 112, dbp: 72, temp: 36.6, glucose: 92, sleep: 7.3, mood: 4.2, exercise: 150, pvt: 262 },
    sd: { hr: 2.2, sbp: 4, dbp: 3, temp: 0.12, glucose: 5, sleep: 0.3, mood: 0.45, exercise: 10, pvt: 10 } },
  { id: 'tomas', name: 'Tomás Reyes', role: 'Commander', initials: 'TR', consentShare: true,
    base: { hr: 64, sbp: 118, dbp: 76, temp: 36.7, glucose: 96, sleep: 6.7, mood: 4.0, exercise: 145, pvt: 281 },
    sd: { hr: 2.5, sbp: 4, dbp: 3, temp: 0.12, glucose: 5, sleep: 0.35, mood: 0.45, exercise: 12, pvt: 11 } },
  { id: 'kenji', name: 'Kenji Watanabe', role: 'Medical Officer', initials: 'KW', consentShare: false,
    base: { hr: 61, sbp: 116, dbp: 74, temp: 36.5, glucose: 90, sleep: 7.0, mood: 3.9, exercise: 150, pvt: 270 },
    sd: { hr: 2.3, sbp: 4, dbp: 3, temp: 0.12, glucose: 5, sleep: 0.3, mood: 0.45, exercise: 10, pvt: 10 } },
  { id: 'ruth', name: 'Ruth Adeyemi', role: 'Mission Specialist', initials: 'RA', consentShare: true,
    base: { hr: 60, sbp: 110, dbp: 70, temp: 36.6, glucose: 94, sleep: 7.1, mood: 4.1, exercise: 150, pvt: 268 },
    sd: { hr: 2.2, sbp: 4, dbp: 3, temp: 0.12, glucose: 5, sleep: 0.3, mood: 0.45, exercise: 10, pvt: 10 } },
]

export type StoryKind = 'adapt' | 'spaceweather' | 'spe' | 'morale' | 'exercise' | 'fever' | 'sleep' | 'milestone'
export interface ScriptedEvent {
  day: number
  kind: StoryKind
  title: string
  detail: string
  crewId?: string
  donki?: string[]
  sources?: string[]
}

/** Key real events from the bundled DONKI cache (IDs verified against data/raw). */
export const DONKI_X87_FLR = '2024-05-14T16:46:00-FLR-001'
export const DONKI_X87_CME = '2024-05-14T17:00:00-CME-001'
export const DONKI_MAY20_CME = '2024-05-20T05:36:00-CME-001'
export const SPE_DAY = dayOfDate('2024-05-20T05:36Z') // 90
export const WATCH_DAY = dayOfDate('2024-05-14T16:46Z') // 84

export const SCRIPT: ScriptedEvent[] = [
  { day: 1, kind: 'milestone', title: 'Trans-Mars injection', detail: 'Mission day 1. HALO switches from pre-flight baseline collection to in-flight monitoring.' },
  { day: 3, kind: 'adapt', title: 'Adaptation phase', detail: 'Expected early changes (heart rate, sleep, mood) as the body adapts to weightlessness. HALO watches but does not escalate adaptation-window changes.', sources: ['hazGravity'] },
  { day: WATCH_DAY, kind: 'spaceweather', title: 'Space-weather watch: X8.7 flare', detail: 'Real event: X8.7 flare from Active Region 13664 with a ≈2,100–2,200 km/s CME; DONKI’s model forecast arrival at Mars ≈2 days later. HALO raises a watch and pre-stages the shelter checklist.', donki: [DONKI_X87_FLR, DONKI_X87_CME] },
  { day: SPE_DAY, kind: 'spe', title: 'Solar particle event: shelter now', detail: 'Real event: a far-side eruption launched a ≈2,680 km/s fast halo CME (DONKI). NASA reported the largest radiation surge Curiosity’s RAD had recorded at Mars. HALO triggers the storm-shelter protocol.', donki: [DONKI_MAY20_CME], sources: ['marsStorm'] },
  { day: 104, kind: 'morale', title: 'Mid-mission morale lull', detail: 'Crew mood trending down. The “third-quarter phenomenon” is reported in some analog studies, not universally; HALO treats it as a watch item, not a prediction.', sources: ['thirdQuarter'] },
  { day: 156, kind: 'fever', title: 'Fever onset (simulated)', detail: 'Leila logs 38.4 °C with raised heart rate. Ground is ≈19 min away one-way: HALO runs autonomous triage with the onboard medkit.', crewId: 'leila' },
]

export interface MissionData {
  seed: number
  crew: CrewMember[]
  /** series[crewId][indicator][index], index 0 = day -(PRE_DAYS-1) */
  series: Record<string, Record<IndicatorId, (number | null)[]>>
  /** daily dose (mSv) per crew, index by mission day 1..180 at [day-1] */
  dose: number[]
  sheltered: boolean
}

export const idxOf = (day: number) => day + PRE_DAYS - 1
export const dayOfIdx = (i: number) => i - PRE_DAYS + 1
export const TOTAL = PRE_DAYS + MISSION_DAYS

const ramp = (d: number, a: number, b: number) => (d <= a ? 0 : d >= b ? 1 : (d - a) / (b - a))
const bump = (d: number, a: number, peak: number, b: number) => (d <= a || d >= b ? 0 : d <= peak ? (d - a) / (peak - a) : (b - d) / (b - peak))

export interface SimOptions { seed?: number; followCountermeasures?: boolean; sheltered?: boolean }

/** Illustrative SPE dose increments (mSv) for the scenario. NOT measured values. */
export const SPE_DOSE_ILLUSTRATIVE = { unsheltered: 45, sheltered: 14 }
export const CRUISE_RATE = 1.8 // mSv/day, Curiosity RAD cruise measurement (see FACTS.cruiseDose)

export function simulateMission(opts: SimOptions = {}): MissionData {
  const seed = opts.seed ?? 2026
  const follow = opts.followCountermeasures ?? true
  const sheltered = opts.sheltered ?? true
  const series: MissionData['series'] = {}

  for (const c of CREW) {
    const r = mulberry32(seed ^ hashSeed(c.id))
    const s = {} as Record<IndicatorId, (number | null)[]>
    for (const ind of IND_IDS) s[ind] = []
    for (let i = 0; i < TOTAL; i++) {
      const d = dayOfIdx(i)
      const inflight = d >= 1
      const adapt = inflight ? Math.exp(-(d - 1) / 4) : 0
      const fx: Record<IndicatorId, number> = { hr: 0, sbp: 0, dbp: 0, temp: 0, glucose: 0, sleep: 0, mood: 0, exercise: 0, pvt: 0 }
      if (inflight) {
        fx.hr += 6 * adapt; fx.sleep -= 0.9 * adapt; fx.mood -= 0.7 * adapt; fx.pvt += 18 * adapt; fx.sbp -= 5 * adapt
        // Space-weather: disturbed sleep and stress around shelter period (all crew)
        const spe = bump(d, SPE_DAY - 1, SPE_DAY, SPE_DAY + 3)
        fx.sleep -= 1.6 * spe; fx.hr += 7 * spe; fx.mood -= 0.8 * spe; fx.pvt += 22 * spe
        // Mid-mission morale lull (all crew, mild)
        const lull = bump(d, 96, 118, 140)
        fx.mood -= 0.9 * lull; fx.sleep -= 0.25 * lull
      }
      if (c.id === 'leila' && inflight) {
        // Sleep decline days 38-66, HALO countermeasure from day 50 brings recovery by ~75
        const decl = ramp(d, 38, 66)
        const rec = follow ? ramp(d, 64, 78) : 0
        const sleepDrop = 2.25 * decl * (1 - rec)
        fx.sleep -= sleepDrop; fx.pvt += 26 * sleepDrop; fx.mood -= 0.45 * sleepDrop; fx.hr += 2.2 * sleepDrop
        // Exercise adherence slip days 112-140, recovery after plan from ~132
        const slip = ramp(d, 112, 126) * (1 - (follow ? ramp(d, 132, 142) : 0))
        fx.exercise -= 70 * slip; fx.glucose += 7 * slip
        // Fever day 156-159
        const fev = bump(d, 155, 157, 160)
        fx.temp += 1.8 * fev; fx.hr += 26 * fev; fx.sleep -= 1.2 * fev; fx.mood -= 1.2 * fev; fx.pvt += 30 * fev
      }
      if (c.id === 'tomas' && inflight) {
        const lullT = bump(d, 100, 122, 146)
        fx.mood -= 0.6 * lullT; fx.sleep -= 0.5 * lullT
      }
      if (c.id === 'ruth' && inflight) {
        fx.sbp += 9 * ramp(d, 120, 150) * (1 - ramp(d, 160, 175)); fx.dbp += 5 * ramp(d, 120, 150) * (1 - ramp(d, 160, 175))
      }
      for (const ind of IND_IDS) {
        const missing = inflight && r() < 0.03 && !(d >= 150 && d <= 162) && !(d >= SPE_DAY - 2 && d <= SPE_DAY + 2)
        const noise = gauss(r) * c.sd[ind]
        let v = c.base[ind] + fx[ind] + noise
        if (ind === 'exercise' && !inflight) v = c.base.exercise + noise * 0.8
        if (missing) { s[ind].push(null); continue }
        if (ind === 'mood') v = Math.max(1, Math.min(5, Math.round(v)))
        if (ind === 'sleep') v = Math.max(2.5, Math.min(10, v))
        if (ind === 'exercise') v = Math.max(0, v)
        s[ind].push(round(v, DECIMALS[ind]))
      }
    }
    series[c.id] = s
  }

  const dose: number[] = []
  for (let d = 1; d <= MISSION_DAYS; d++) {
    let x = CRUISE_RATE
    if (d === SPE_DAY) x += sheltered ? SPE_DOSE_ILLUSTRATIVE.sheltered : SPE_DOSE_ILLUSTRATIVE.unsheltered
    dose.push(round(x, 2))
  }
  return { seed, crew: CREW, series, dose, sheltered }
}

export function round(v: number, d: number) {
  const p = 10 ** d
  return Math.round(v * p) / p
}

export function cumulativeDose(m: MissionData, day: number): number {
  let s = 0
  for (let d = 1; d <= Math.min(day, MISSION_DAYS); d++) s += m.dose[d - 1]
  return round(s, 1)
}
