// Autonomous Triage: deterministic, offline, rule-based decision tree. NOT a chatbot, NOT a medical device.
// Absolute thresholds come from published clinical guidelines (AHA, NHLBI, CDC, ADA; see data/clinical.ts).
// The protocol steps are generic first-aid style actions for demonstration, NOT flight-surgeon-approved protocols.
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

/** Guideline-based thresholds. Sources: AHA (BP, HR), NHLBI (low BP), CDC (fever), ADA (glucose). */
export const TRIAGE_THRESHOLDS = {
  feverC: 38.0, // CDC: measured >= 38.0 °C
  feverHr: 100, // AHA: tachycardia > 100 bpm at rest
  sbpStage2: 140, dbpStage2: 90, // AHA stage 2 hypertension
  sbpCrisis: 180, dbpCrisis: 120, // AHA hypertensive crisis: > 180 and/or > 120
  sbpLow: 90, // NHLBI: low blood pressure below 90/60
  hrHighWithLowBp: 100,
  glucoseL1Low: 70, glucoseL2Low: 54, // ADA level 1 / level 2 hypoglycaemia
  glucoseL1High: 180, glucoseL2High: 250, // level 1 / level 2 hyperglycaemia
  autonomousDelaySec: 300,
}
export const TRIAGE_SOURCES: Record<string, string[]> = {
  'R2-FEVER': ['cdcFever'], 'R2-FEVER+HR': ['cdcFever', 'mayoHr'], 'R3-BP-CRISIS': ['ahaBp'], 'R3-BP-STAGE2': ['ahaBp'], 'R3-BP-LOW': ['nhlbiLowBp', 'mayoHr'],
  'R4-GLU-L2': ['adaGlucose', 'adaTir', 'ada1515'], 'R4-GLU-L1': ['adaGlucose', 'adaTir', 'ada1515'], 'R1-SPE': ['radBrief'], 'R6-SLEEP': ['aasmSleep', 'sleepStudy'], 'R7-PVT': ['pvtB', 'spinoffRst'],
  'R8-EXERCISE': ['boneBrief'],
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
    const tachy = (v.hr != null && v.hr > T.feverHr) || st.hr === 'drift' || st.hr === 'watch'
    hits.push({
      id: tachy ? 'R2-FEVER+HR' : 'R2-FEVER', level: tachy ? 'urgent' : 'monitor',
      title: tachy ? 'Fever with raised heart rate' : 'Raised temperature',
      why: `Temperature ${v.temp.toFixed(1)} °C meets the CDC fever definition (≥ ${T.feverC.toFixed(1)} °C)${tachy ? ', with heart rate above your normal or over 100 bpm' : ''}. Possible infection; immune changes are a known spaceflight risk.`,
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

  if ((v.sbp != null && v.sbp > T.sbpCrisis) || (v.dbp != null && v.dbp > T.dbpCrisis)) hits.push({
    id: 'R3-BP-CRISIS', level: 'urgent', title: 'Blood pressure in the crisis range',
    why: `Reading ${v.sbp}/${v.dbp} mmHg is above the AHA hypertensive-crisis line (>${T.sbpCrisis} and/or >${T.dbpCrisis}). AHA advises re-testing after a short rest and urgent help if it stays high or symptoms appear.`,
    steps: [{ text: 'Rest quietly and re-measure.', item: 'bpcuff' }, { text: 'Check for chest pain, breathlessness, weakness, vision or speech change.' }, { text: 'If still above the line or any symptom: contact flight surgeon now.' }],
    indicators: ['sbp', 'dbp'],
  })
  else if ((v.sbp != null && v.sbp >= T.sbpStage2) || (v.dbp != null && v.dbp >= T.dbpStage2)) hits.push({
    id: 'R3-BP-STAGE2', level: 'monitor', title: 'Blood pressure in AHA stage 2 range',
    why: `Reading ${v.sbp}/${v.dbp} mmHg is at or above ${T.sbpStage2}/${T.dbpStage2}. One reading is not a diagnosis; a pattern is.`,
    steps: [{ text: 'Re-measure morning and evening for 3 days, seated, arm at heart level.', item: 'bpcuff' }, { text: 'Include in the next flight-surgeon packet.' }],
    indicators: ['sbp', 'dbp'],
  })
  else if (v.sbp != null && v.sbp < T.sbpLow && v.hr != null && v.hr > T.hrHighWithLowBp) hits.push({
    id: 'R3-BP-LOW', level: 'urgent', title: 'Low blood pressure with fast heart rate',
    why: `Systolic below ${T.sbpLow} (NHLBI low-BP line) with heart rate over ${T.hrHighWithLowBp}: pattern consistent with fluid loss or poor orthostatic tolerance.`,
    steps: [{ text: 'Lie down / restrain, legs elevated.' }, { text: 'Oral rehydration.', item: 'ors' }, { text: 'Contact flight surgeon now.' }],
    indicators: ['sbp', 'hr'],
  })
  else if (st.sbp === 'drift' || st.dbp === 'drift') hits.push({
    id: 'R3-BP-DRIFT', level: 'monitor', title: 'Blood pressure drifting from your baseline',
    why: 'Several consecutive readings outside your personal range.',
    steps: [{ text: 'Measure morning and evening for 3 days.', item: 'bpcuff' }, { text: 'Review hydration, sleep and workload.' }],
    indicators: ['sbp', 'dbp'],
  })

  if (v.glucose != null && (v.glucose < T.glucoseL2Low || v.glucose > T.glucoseL2High)) hits.push({
    id: 'R4-GLU-L2', level: 'urgent', title: v.glucose < T.glucoseL2Low ? 'Level 2 low blood glucose' : 'Level 2 high blood glucose',
    why: `Reading ${v.glucose} mg/dL is ${v.glucose < T.glucoseL2Low ? `below ${T.glucoseL2Low}, which ADA classes as level 2 (clinically significant) hypoglycaemia` : `above ${T.glucoseL2High}, which ADA-aligned definitions class as level 2 (very elevated) glucose`}.`,
    steps: [{ text: 'Re-test with a fresh strip.', item: 'strips' }, { text: v.glucose < T.glucoseL2Low ? 'Take 15 g fast-acting carbohydrate, re-test in 15 min (ADA “15-15”).' : 'Hydrate; avoid strenuous activity.' }, { text: 'Contact flight surgeon now.' }],
    indicators: ['glucose'],
  })
  else if (v.glucose != null && (v.glucose < T.glucoseL1Low || v.glucose > T.glucoseL1High)) hits.push({
    id: 'R4-GLU-L1', level: 'monitor', title: v.glucose < T.glucoseL1Low ? 'Level 1 low blood glucose' : 'Glucose above range',
    why: `Reading ${v.glucose} mg/dL is outside the ADA time-in-range band (${T.glucoseL1Low}–${T.glucoseL1High}).`,
    steps: [{ text: 'Re-test with a fresh strip.', item: 'strips' }, { text: v.glucose < T.glucoseL1Low ? 'Take 15 g fast-acting carbohydrate, re-test in 15 min (ADA “15-15”).' : 'Re-test fasting tomorrow; review meals and activity.' }],
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
