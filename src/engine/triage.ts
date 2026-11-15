// Autonomous Triage: deterministic, offline, rule-based decision tree. NOT a chatbot, NOT a medical device.
// All thresholds are ILLUSTRATIVE and exist to demonstrate explainable logic.
import type { IndicatorId } from '../data/domain'
import type { DriftState } from './drift'

export type Level = 'self' | 'monitor' | 'urgent'
export const LEVEL_RANK: Record<Level, number> = { self: 0, monitor: 1, urgent: 2 }
export const LEVEL_LABEL: Record<Level, string> = { self: 'Self-manage', monitor: 'Monitor', urgent: 'Urgent' }

export interface MedItem { id: string; name: string; qty: number; scarceAt: number; note: string }

export const DEFAULT_MEDKIT: MedItem[] = [
  { id: 'thermo', name: 'Thermometer probe covers', qty: 24, scarceAt: 5, note: 'Single use' },
  { id: 'antipyretic', name: 'Antipyretic / analgesic (per crew medical checklist)', qty: 6, scarceAt: 4, note: 'Dose only as directed by the onboard medical checklist' },
  { id: 'ors', name: 'Oral rehydration sachets', qty: 10, scarceAt: 3, note: '' },
  { id: 'mask', name: 'Sleep mask + earplugs', qty: 8, scarceAt: 2, note: '' },
  { id: 'light', name: 'Tunable light panel (blue-enriched / dim)', qty: 1, scarceAt: 0, note: 'Fixed equipment' },
  { id: 'bpcuff', name: 'Blood pressure cuff', qty: 1, scarceAt: 0, note: 'Fixed equipment' },
  { id: 'strips', name: 'Glucose test strips', qty: 30, scarceAt: 8, note: '' },
  { id: 'gloves', name: 'Nitrile gloves (pairs)', qty: 40, scarceAt: 10, note: '' },
  { id: 'dosimeter', name: 'Personal dosimeter', qty: 4, scarceAt: 0, note: 'One per crew member' },
]

export interface TriageInput {
  latest: Partial<Record<IndicatorId, number | null>>
  states: Partial<Record<IndicatorId, DriftState>>
  streaks?: Partial<Record<IndicatorId, number>>
  speActive: boolean
  watchActive: boolean
  delaySec: number
  medkit: MedItem[]
}

export interface Step { text: string; item?: string }
export interface RuleHit {
  id: string
  level: Level
  title: string
  why: string
  steps: Step[]
  indicators: IndicatorId[]
}
export interface TriageResult {
  level: Level
  hits: RuleHit[]
  contactGround: boolean
  autonomous: boolean
  groundNote: string
  supplyWarnings: string[]
}

/** Illustrative thresholds (not medical advice). */
export const TRIAGE_THRESHOLDS = {
  feverC: 38.0,
  feverHr: 90,
  sbpHigh: 160,
  dbpHigh: 100,
  sbpLow: 90,
  hrHighWithLowBp: 100,
  glucoseHigh: 200,
  glucoseLow: 60,
  autonomousDelaySec: 300,
}

export function runTriage(t: TriageInput): TriageResult {
  const T = TRIAGE_THRESHOLDS
  const hits: RuleHit[] = []
  const v = t.latest
  const st = t.states

  if (t.speActive) hits.push({
    id: 'R1-SPE', level: 'urgent', title: 'Solar particle event: shelter now',
    why: 'An active solar particle event raises dose rapidly. Sheltering is the countermeasure; the NASA-STD-3001 limit is 250 mSv per event.',
    steps: [{ text: 'Move to the storm shelter (water/stowage-lined area) now.' }, { text: 'Wear your personal dosimeter.', item: 'dosimeter' }, { text: 'Stay until HALO clears the all-clear (flux back below alert).' }, { text: 'Log any nausea or symptoms.' }],
    indicators: [],
  })
  else if (t.watchActive) hits.push({
    id: 'R1b-WATCH', level: 'monitor', title: 'Space-weather watch',
    why: 'A large flare/CME is on record. HALO pre-stages the shelter checklist so the crew can move in minutes.',
    steps: [{ text: 'Review the shelter checklist.' }, { text: 'Stow loose items near the shelter.' }, { text: 'Check your dosimeter.', item: 'dosimeter' }],
    indicators: [],
  })

  if (v.temp != null && v.temp >= T.feverC) {
    const tachy = (v.hr != null && v.hr >= T.feverHr) || st.hr === 'drift' || st.hr === 'watch'
    hits.push({
      id: tachy ? 'R2-FEVER+HR' : 'R2-FEVER', level: tachy ? 'urgent' : 'monitor',
      title: tachy ? 'Fever with raised heart rate' : 'Raised temperature',
      why: `Temperature ${v.temp.toFixed(1)} °C ≥ ${T.feverC} °C${tachy ? ' together with heart rate above your normal' : ''}. Possible infection; immune changes are a known spaceflight risk.`,
      steps: [
        { text: 'Rest in crew quarters; minimise contact (closed habitat).', item: 'gloves' },
        { text: 'Hydrate: oral rehydration sachet.', item: 'ors' },
        { text: 'Antipyretic only as directed by the onboard medical checklist.', item: 'antipyretic' },
        { text: 'Re-measure temperature and heart rate every 4 hours.', item: 'thermo' },
        ...(tachy ? [{ text: 'Contact flight surgeon now (packet queued automatically).' }] : []),
      ],
      indicators: ['temp', 'hr'],
    })
  }

  if ((v.sbp != null && v.sbp >= T.sbpHigh) || (v.dbp != null && v.dbp >= T.dbpHigh)) hits.push({
    id: 'R3-BP-HIGH', level: 'urgent', title: 'Very high blood pressure',
    why: `Reading ${v.sbp}/${v.dbp} mmHg is above the illustrative urgent threshold (${T.sbpHigh}/${T.dbpHigh}).`,
    steps: [{ text: 'Sit quietly 5 minutes and re-measure.', item: 'bpcuff' }, { text: 'If still high, contact flight surgeon now.' }],
    indicators: ['sbp', 'dbp'],
  })
  else if (v.sbp != null && v.sbp <= T.sbpLow && v.hr != null && v.hr >= T.hrHighWithLowBp) hits.push({
    id: 'R3-BP-LOW', level: 'urgent', title: 'Low blood pressure with fast heart rate',
    why: 'Pattern consistent with poor orthostatic tolerance or fluid loss.',
    steps: [{ text: 'Lie down / restrain, legs elevated.' }, { text: 'Oral rehydration.', item: 'ors' }, { text: 'Contact flight surgeon now.' }],
    indicators: ['sbp', 'hr'],
  })
  else if (st.sbp === 'drift' || st.dbp === 'drift') hits.push({
    id: 'R3-BP-DRIFT', level: 'monitor', title: 'Blood pressure drifting from your baseline',
    why: 'Several consecutive readings outside your personal range.',
    steps: [{ text: 'Measure morning and evening for 3 days.', item: 'bpcuff' }, { text: 'Review hydration, sleep and workload.' }],
    indicators: ['sbp', 'dbp'],
  })

  if (v.glucose != null && (v.glucose >= T.glucoseHigh || v.glucose <= T.glucoseLow)) hits.push({
    id: 'R4-GLU', level: 'urgent', title: v.glucose <= T.glucoseLow ? 'Low blood glucose' : 'High blood glucose',
    why: `Reading ${v.glucose} mg/dL outside the illustrative safe band (${T.glucoseLow}–${T.glucoseHigh}).`,
    steps: [{ text: 'Re-test with a fresh strip.', item: 'strips' }, { text: v.glucose <= T.glucoseLow ? 'Take fast-acting carbohydrate.' : 'Hydrate; avoid strenuous activity.' }, { text: 'Contact flight surgeon.' }],
    indicators: ['glucose'],
  })
  else if (st.glucose === 'drift') hits.push({
    id: 'R4-GLU-DRIFT', level: 'monitor', title: 'Glucose drifting from your baseline',
    why: 'Persistent shift; often follows lower activity.', steps: [{ text: 'Re-test fasting tomorrow.', item: 'strips' }, { text: 'Check exercise adherence.' }], indicators: ['glucose'],
  })

  if (v.mood != null && v.mood <= 1) hits.push({
    id: 'R5-MOOD-LOW', level: 'urgent', title: 'Very low mood',
    why: 'Behavioural health is a top long-mission risk. A 1/5 check-in warrants a human conversation.',
    steps: [{ text: 'Talk to the commander or a crewmate you trust today.' }, { text: 'Queue a private behavioural-health session with ground.' }],
    indicators: ['mood'],
  })
  else if (st.mood === 'drift') hits.push({
    id: 'R5-MOOD-DRIFT', level: 'monitor', title: 'Mood below your normal for several days',
    why: 'Persistent mood drop vs. your own baseline.',
    steps: [{ text: 'Use the private journal (NASA behavioural scientists use journaling).' }, { text: 'Schedule a delayed call home.' }, { text: 'Protect your sleep window.' }],
    indicators: ['mood'],
  })

  if (st.sleep === 'drift') hits.push({
    id: 'R6-SLEEP', level: 'monitor', title: 'Sleep below your baseline',
    why: 'Several nights short of your personal norm. Sleep loss is the most common spaceflight stressor and drives mood and alertness.',
    steps: [{ text: 'Fixed sleep window tonight; screens dim 60 min before.' }, { text: 'Timed light: bright/blue-enriched in the morning, dim in the evening.', item: 'light' }, { text: 'Eye mask + earplugs.', item: 'mask' }, { text: 'Ask commander to review tomorrow’s workload.' }],
    indicators: ['sleep'],
  })
  if (st.pvt === 'drift') hits.push({
    id: 'R7-PVT', level: 'monitor', title: 'Reaction time slower than your normal',
    why: 'Objective fatigue marker. Defer safety-critical tasks until it recovers.',
    steps: [{ text: 'No piloting/EVA/critical procedures until a re-test is normal.' }, { text: 'Re-test after sleep.' }],
    indicators: ['pvt'],
  })
  if (st.exercise === 'drift') hits.push({
    id: 'R8-EXERCISE', level: 'self', title: 'Exercise below plan (Gravity Debt rising)',
    why: 'Weight-bearing bones lose 1–1.5% per month in spaceflight; exercise is the main countermeasure.',
    steps: [{ text: 'Split into two shorter sessions today.' }, { text: 'Prioritise resistance work.' }, { text: 'Log minutes after each session.' }],
    indicators: ['exercise'],
  })
  if (st.hr === 'drift' && !hits.some((h) => h.indicators.includes('hr'))) hits.push({
    id: 'R9-HR', level: 'monitor', title: 'Resting heart rate drifting',
    why: 'Persistent change vs. your baseline; check sleep, hydration and illness.', steps: [{ text: 'Re-measure tomorrow morning, seated.' }, { text: 'Check temperature.', item: 'thermo' }], indicators: ['hr'],
  })

  const level: Level = hits.reduce<Level>((acc, h) => (LEVEL_RANK[h.level] > LEVEL_RANK[acc] ? h.level : acc), 'self')
  const autonomous = t.delaySec >= T.autonomousDelaySec
  const contactGround = level === 'urgent'
  const rt = 2 * t.delaySec
  const groundNote = !contactGround
    ? 'No ground contact needed. Summary goes in the next routine downlink.'
    : autonomous
      ? `Ground reply cannot arrive in under ${Math.round(rt / 60)} min (round trip). HALO runs the protocol now and queues the packet.`
      : 'Contact the flight surgeon now; HALO has the packet ready.'

  const supplyWarnings: string[] = []
  const used = new Set(hits.flatMap((h) => h.steps.map((s) => s.item).filter(Boolean) as string[]))
  for (const id of used) {
    const it = t.medkit.find((m) => m.id === id)
    if (!it) continue
    if (it.qty <= 0) supplyWarnings.push(`${it.name}: none left. Use the alternative step and tell ground.`)
    else if (it.scarceAt > 0 && it.qty <= it.scarceAt) supplyWarnings.push(`${it.name}: only ${it.qty} left. Conserve.`)
  }
  return { level, hits, contactGround, autonomous, groundNote, supplyWarnings }
}
