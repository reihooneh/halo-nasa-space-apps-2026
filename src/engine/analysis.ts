// Wires the mission data to the drift engine and exposes per-crew, per-day derived state.
import { IND, INDICATORS, type IndicatorId } from '../data/domain'
import { analyze, firstIndex, populationFlags, SCALE_FLOOR, type DayResult } from './drift'
import { idxOf, PRE_DAYS, type MissionData } from '../sim/mission'

export type CrewAnalysis = Record<IndicatorId, DayResult[]>
export type Analysis = Record<string, CrewAnalysis>

export function analyzeMission(m: MissionData, overrides?: Record<string, number>): Analysis {
  const out: Analysis = {}
  for (const c of m.crew) {
    const ca = {} as CrewAnalysis
    for (const ind of INDICATORS) {
      const vals = m.series[c.id][ind.id].slice()
      if (overrides) {
        for (const [k, v] of Object.entries(overrides)) {
          const [cid, dayS, iid] = k.split(':')
          if (cid === c.id && iid === ind.id) {
            const i = idxOf(Number(dayS))
            if (i >= 0 && i < vals.length) vals[i] = v
          }
        }
      }
      ca[ind.id] = analyze(vals, { preCount: PRE_DAYS, dir: ind.concern, floor: SCALE_FLOOR[ind.id] })
    }
    out[c.id] = ca
  }
  return out
}

export interface DetectionEvent {
  crewId: string
  indicator: IndicatorId
  personalDay: number
  populationDay: number | null
  leadDays: number | null
}

/** For the story: first personal drift flag per crew+indicator (after day 10), and when the population rule would flag. */
export function detections(m: MissionData, a: Analysis): DetectionEvent[] {
  const ev: DetectionEvent[] = []
  for (const c of m.crew) {
    for (const ind of INDICATORS) {
      const res = a[c.id][ind.id]
      let from = idxOf(11)
      while (from < res.length) {
        const i = firstIndex(res, (r) => r.state === 'drift', from)
        if (i < 0) break
        const vals = m.series[c.id][ind.id]
        const pop = populationFlags(vals, IND[ind.id].population, ind.concern)
        // population flag within the same episode window (up to 45 days after)
        const startEp = Math.max(idxOf(1), i - 10)
        const pj = firstIndex(pop, (p, k) => p && k <= i + 45, startEp)
        const pDay = pj >= 0 ? pj - PRE_DAYS + 1 : null
        const day = i - PRE_DAYS + 1
        ev.push({ crewId: c.id, indicator: ind.id, personalDay: day, populationDay: pDay, leadDays: pDay != null ? pDay - day : null })
        // skip to the end of this episode
        const end = firstIndex(res, (r) => r.state === 'ok', i)
        if (end < 0) break
        from = end + 5
      }
    }
  }
  return ev.sort((x, y) => x.personalDay - y.personalDay)
}
