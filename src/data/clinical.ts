// Clinical reference layer: classifies a single reading against PUBLISHED guidelines (AHA, NHLBI, CDC, ADA, AASM/SRS,
// PVT-B, PHQ-2). This is decision support for comparison only. HALO is not a medical device.
import type { IndicatorId } from './domain'

export type Tone = 'ok' | 'info' | 'warn' | 'bad'
export interface ClinicalClass { label: string; tone: Tone; source: string }

export function bpCategory(sys?: number | null, dia?: number | null): ClinicalClass | null {
  if (sys == null || dia == null) return null
  if (sys > 180 || dia > 120) return { label: 'Hypertensive crisis', tone: 'bad', source: 'ahaBp' }
  if (sys >= 140 || dia >= 90) return { label: 'Stage 2 hypertension', tone: 'bad', source: 'ahaBp' }
  if (sys >= 130 || dia >= 80) return { label: 'Stage 1 hypertension', tone: 'warn', source: 'ahaBp' }
  if (sys < 90 || dia < 60) return { label: 'Low (below 90/60)', tone: 'warn', source: 'nhlbiLowBp' }
  if (sys >= 120) return { label: 'Elevated', tone: 'info', source: 'ahaBp' }
  return { label: 'Normal', tone: 'ok', source: 'ahaBp' }
}

export function classify(id: IndicatorId, v: number | null | undefined, latest: Partial<Record<IndicatorId, number | null>> = {}): ClinicalClass | null {
  if (v == null) return null
  switch (id) {
    case 'sbp': case 'dbp': return bpCategory(latest.sbp ?? (id === 'sbp' ? v : null), latest.dbp ?? (id === 'dbp' ? v : null))
    case 'hr':
      if (v > 100) return { label: 'Tachycardia (>100)', tone: 'warn', source: 'mayoHr' }
      if (v < 60) return { label: 'Below 60 (common if fit)', tone: 'info', source: 'mayoHr' }
      return { label: 'Normal 60–100', tone: 'ok', source: 'mayoHr' }
    case 'temp':
      return v >= 38.0 ? { label: 'Fever (≥38.0 °C)', tone: 'bad', source: 'cdcFever' } : { label: 'No fever', tone: 'ok', source: 'cdcFever' }
    case 'glucose':
      if (v < 54) return { label: 'Level 2 low (<54)', tone: 'bad', source: 'adaGlucose' }
      if (v < 70) return { label: 'Level 1 low (54–69)', tone: 'warn', source: 'adaGlucose' }
      if (v > 250) return { label: 'Level 2 high (>250)', tone: 'bad', source: 'adaTir' }
      if (v > 180) return { label: 'Level 1 high (>180)', tone: 'warn', source: 'adaTir' }
      return { label: 'In range 70–180', tone: 'ok', source: 'adaTir' }
    case 'sleep':
      if (v <= 6) return { label: '≤6 h: inadequate', tone: 'warn', source: 'aasmPress' }
      if (v < 7) return { label: 'Below 7 h target', tone: 'info', source: 'aasmSleep' }
      return { label: 'Meets ≥7 h', tone: 'ok', source: 'aasmSleep' }
    default: return null
  }
}

export const PVT_B = { durationMs: 180_000, isiMinMs: 2000, isiMaxMs: 5000, lapseMs: 355, falseStartMs: 100 }
export const PVT_DEMO_MS = 60_000 // demo-length run; clinical PVT-B is 3 minutes

export const PHQ2_ITEMS = ['Little interest or pleasure in doing things', 'Feeling down, depressed or hopeless'] as const
export const PHQ2_OPTIONS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] as const
export const phq2Positive = (score: number) => score >= 3

/** The reference table shown on the Clinical reference page. */
export const CLINICAL_TABLE: { measure: string; rule: string; use: string; sources: string[] }[] = [
  { measure: 'Blood pressure', rule: 'Normal <120/<80 · Elevated 120–129/<80 · Stage 1 130–139 or 80–89 · Stage 2 ≥140 or ≥90 · Crisis >180 and/or >120 mmHg', use: 'Category on every BP reading; crisis triggers urgent triage', sources: ['ahaBp'] },
  { measure: 'Low blood pressure', rule: 'Below 90/60 mmHg (often normal if no symptoms)', use: 'Low-BP rule, with fast HR → urgent', sources: ['nhlbiLowBp'] },
  { measure: 'Resting heart rate', rule: '60–100 bpm normal; >100 tachycardia; fit adults may rest near 40', use: 'Tachycardia rule; low HR judged only vs your baseline', sources: ['mayoHr'] },
  { measure: 'Temperature', rule: 'Fever = measured ≥38.0 °C (100.4 °F)', use: 'Fever rule', sources: ['cdcFever'] },
  { measure: 'Glucose', rule: 'Level 1 low 54–69 · Level 2 low <54 · Time-in-range 70–180 · Level 1 high >180 · Level 2 high >250 mg/dL', use: 'Low/high glucose rules; level 2 → urgent', sources: ['adaGlucose', 'adaTir'] },
  { measure: 'Sleep', rule: 'Adults ≥7 h/night; ≤6 h inadequate', use: 'Sleep category; fixed-rule comparison at 6 h', sources: ['aasmSleep', 'aasmPress'] },
  { measure: 'Alertness (PVT-B)', rule: '3-min test; lapse = response ≥355 ms; false start <100 ms', use: 'Reaction test scoring', sources: ['pvtB', 'pvtLapse', 'spinoffRst'] },
  { measure: 'Mood (PHQ-2)', rule: 'Two items 0–3; total ≥3 = positive screen, needs follow-up', use: 'Optional validated screen in Log', sources: ['phq2'] },
  { measure: 'Radiation', rule: 'Career 600 mSv; 250 mSv per solar particle event', use: 'Dose ledger and shelter rule', sources: ['radBrief'] },
]
