// HALO domain model. All science text is paraphrased from the sources listed with it.
export type HazardId = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'hostile'
export type IndicatorId = 'hr' | 'sbp' | 'dbp' | 'temp' | 'glucose' | 'sleep' | 'mood' | 'exercise' | 'pvt'
export type SystemId = 'cardio' | 'msk' | 'brain' | 'immune' | 'eyes' | 'sleep' | 'sensorimotor'
export type EnvId = 'leo' | 'moon' | 'mars' | 'hera'

export interface Hazard {
  id: HazardId
  letter: string
  name: string
  short: string
  summary: string
  effects: string[]
  countermeasures: string[]
  indicators: IndicatorId[]
  systems: SystemId[]
  sources: string[]
  color: string
}

// RIDGE: NASA's grouping of the five hazards (Radiation, Isolation, Distance, Gravity, hostile Environments)
export const HAZARDS: Hazard[] = [
  {
    id: 'radiation', letter: 'R', name: 'Space Radiation', short: 'Radiation', color: '#F59E0B',
    summary: 'Invisible and impossible to feel. Beyond Earth’s magnetic field, galactic cosmic rays and solar storms (solar particle events, coronal mass ejections) expose crews to ionizing radiation.',
    effects: ['Raised cancer risk', 'Central nervous system effects', 'Altered cognition and reduced motor function', 'Behavioural changes'],
    countermeasures: ['Continuous dose monitoring', 'Storm shelter during solar particle events', 'Shielding and mission timing'],
    indicators: ['pvt', 'mood'], systems: ['brain', 'immune'], sources: ['hazRadiation', 'radBrief', 'csaRadiation'],
  },
  {
    id: 'isolation', letter: 'I', name: 'Isolation and Confinement', short: 'Isolation', color: '#A78BFA',
    summary: 'Small crews living in small spaces, far from home, for months. Sleep loss, a disrupted body clock and work overload compound the risk to behavioural health and performance.',
    effects: ['Behavioural changes', 'Sleep loss and circadian misalignment', 'Team friction', 'Reduced performance'],
    countermeasures: ['Behavioural health monitoring and journaling', 'Light therapy to align circadian rhythm', 'Workload management', 'Crew selection, training and support'],
    indicators: ['sleep', 'mood', 'pvt'], systems: ['brain', 'sleep'], sources: ['hazIsolation', 'hrpRisks'],
  },
  {
    id: 'distance', letter: 'D', name: 'Distance from Earth', short: 'Distance', color: '#60A5FA',
    summary: 'The farther the crew travels, the harder it is to get instructions, supplies and medical care from Earth. Mars communication delay can reach about 20 minutes one way, so crews must solve problems with minimal ground support.',
    effects: ['Delayed medical guidance', 'Limited supplies and consumables', 'Menu fatigue'],
    countermeasures: ['Autonomous decision support (HALO)', 'Planning and self-sufficiency', 'Onboard medical capability'],
    indicators: ['hr', 'sbp', 'temp', 'glucose'], systems: ['cardio', 'immune'], sources: ['hazDistance', 'marsDelays'],
  },
  {
    id: 'gravity', letter: 'G', name: 'Gravity Fields', short: 'Gravity', color: '#2DD4BF',
    summary: 'Muscles, bones, inner ear and organs must adapt to weightlessness, to partial gravity on the Moon or Mars, and again on return. Fluids shift toward the head.',
    effects: ['Bone loss (1–1.5% per month in weight-bearing bones)', 'Muscle loss', 'Dizziness and space motion sickness', 'Vision changes (SANS)', 'Lightheadedness on return to gravity', 'Kidney stone risk'],
    countermeasures: ['Daily resistance and aerobic exercise', 'Hydration', 'Thigh cuffs (fluid shift research)', 'Readaptation time before critical tasks'],
    indicators: ['exercise', 'hr', 'sbp', 'dbp'], systems: ['msk', 'cardio', 'eyes', 'sensorimotor'], sources: ['hazGravity', 'hrpRisks', 'boneBrief'],
  },
  {
    id: 'hostile', letter: 'E', name: 'Hostile/Closed Environments', short: 'Environment', color: '#F43F5E',
    summary: 'The spacecraft is both home and machine. Temperature, pressure, lighting, noise and space must be controlled. Microbes spread more easily, stress hormones can rise and the immune system can change.',
    effects: ['Immune changes, latent virus reactivation', 'Microbial spread', 'Stress', 'Poor habitability'],
    countermeasures: ['Environmental monitoring', 'Hygiene and microbial monitoring', 'Habitat design (lighting, noise, volume)'],
    indicators: ['temp', 'hr', 'sleep'], systems: ['immune', 'sleep'], sources: ['hazHostile', 'hrpRisks'],
  },
]

export interface BodySystem {
  id: SystemId
  name: string
  nasaRisk: string
  function: string
  why: string
  measure: string
  actions: string[]
  hazards: HazardId[]
  indicators: IndicatorId[]
  sources: string[]
  levels: { simple: string; crew: string; surgeon: string }
}

export const SYSTEMS: BodySystem[] = [
  {
    id: 'cardio', name: 'Heart & vessels', nasaRisk: 'Risk of Cardiovascular Adaptations',
    function: 'Pumps blood and regulates pressure to every organ.',
    why: 'Weightlessness changes circulation and how the heart and blood vessels work, which may raise the risk of cardiovascular events. Moving back into gravity can cause lightheadedness and fainting.',
    measure: 'Resting heart rate and blood pressure each morning, seated and still.',
    actions: ['Keep aerobic exercise on schedule', 'Hydrate before gravity transitions', 'Report dizziness on standing'],
    hazards: ['gravity', 'distance', 'radiation'], indicators: ['hr', 'sbp', 'dbp'], sources: ['hrpRisks', 'hazGravity'],
    levels: {
      simple: 'Your heart works differently without gravity. HALO watches for changes from your normal.',
      crew: 'Compare morning HR/BP against your own baseline. Persistent upward drift with poor sleep often means fatigue load, not disease.',
      surgeon: 'Track resting HR and BP vs pre-flight robust baseline; flag persistent deviation (≥3 days). Consider orthostatic tolerance before gravity transitions.',
    },
  },
  {
    id: 'msk', name: 'Bones & muscles', nasaRisk: 'Risk of Spaceflight-Induced Bone Changes',
    function: 'Structure, strength and movement.',
    why: 'Without gravity, bones weaken and become more prone to painful fractures. Weight-bearing bones lose on average 1–1.5% of mineral density per month. Muscle and fitness decline without enough exercise.',
    measure: 'Daily exercise minutes (resistance + aerobic). Bone density itself needs imaging, so HALO tracks the countermeasure.',
    actions: ['Hit the daily resistance + aerobic plan', 'Split into two sessions if fatigued', 'Hydrate (kidney stone risk)'],
    hazards: ['gravity'], indicators: ['exercise'], sources: ['hazGravity', 'hrpRisks', 'boneBrief', 'exerciseNtrs'],
    levels: {
      simple: 'Bones get weaker in space. Exercise every day is the shield.',
      crew: 'Exercise adherence is the controllable input. A multi-day shortfall raises your Gravity Debt.',
      surgeon: 'Adherence vs prescription (historical ISS ≈2.5 h/day, 6 d/wk). BMD requires DXA/QCT; HALO monitors countermeasure compliance only.',
    },
  },
  {
    id: 'brain', name: 'Brain & behaviour', nasaRisk: 'Risk of Behavioral Changes and Psychiatric Disorders',
    function: 'Mood, attention, decision-making and teamwork.',
    why: 'Isolation, radiation, distance from Earth and other stressors may affect mental health. Radiation can alter cognition and motor function.',
    measure: 'Daily mood check-in (1–5) with optional journal, plus a short reaction-time test for alertness.',
    actions: ['Use the private journal', 'Schedule a delayed call home', 'Protect sleep window', 'Talk to the commander if mood stays low'],
    hazards: ['isolation', 'radiation', 'distance'], indicators: ['mood', 'pvt'], sources: ['hrpRisks', 'hazIsolation', 'hazRadiation'],
    levels: {
      simple: 'Feeling low or slow happens in space. HALO notices early so you can act early.',
      crew: 'Mood and reaction-time drift together usually point to sleep debt or stress. Act on sleep first.',
      surgeon: 'Mood (1–5) and PVT-style mean RT vs personal baseline; persistence-gated. Not a diagnostic instrument.',
    },
  },
  {
    id: 'immune', name: 'Immune system', nasaRisk: 'Risk of Altered Immune System Responses',
    function: 'Defends against infection.',
    why: 'Spaceflight stress can reactivate dormant viruses, causing rashes and other symptoms. In closed habitats microbes spread more easily and immune changes may raise susceptibility to illness. NASA says more research is needed.',
    measure: 'Body temperature each morning; log symptoms (rash, sore throat).',
    actions: ['Hygiene and surface cleaning', 'Log symptoms early', 'Rest if febrile'],
    hazards: ['hostile', 'radiation', 'distance'], indicators: ['temp'], sources: ['hrpRisks', 'hazHostile'],
    levels: {
      simple: 'Space can weaken your defences. A temperature check each morning helps.',
      crew: 'Fever with fast heart rate is the pattern that triggers triage.',
      surgeon: 'Temperature trend plus HR; fever thresholds illustrative. Consider latent viral reactivation in differential.',
    },
  },
  {
    id: 'eyes', name: 'Eyes & vision', nasaRisk: 'Spaceflight Associated Neuro-ocular Syndrome (SANS)',
    function: 'Vision for every task, from reading checklists to piloting.',
    why: 'Fluids shift toward the head, which may put pressure on the eyes. Eye and brain structure can change in flight, with possible long-term consequences.',
    measure: 'Weekly near-vision check (tumbling-E). Clinical imaging is needed for diagnosis.',
    actions: ['Do the weekly vision check', 'Report blurred near vision', 'Follow fluid-shift countermeasures'],
    hazards: ['gravity'], indicators: [], sources: ['hrpRisks', 'hazGravity', 'hrpResearch'],
    levels: {
      simple: 'Space can change your eyes. A quick weekly test spots changes early.',
      crew: 'A drop of a line or more from your baseline is worth reporting.',
      surgeon: 'Screen-based tumbling-E is a trend indicator only; refer to OCT/fundoscopy per protocol.',
    },
  },
  {
    id: 'sleep', name: 'Sleep & body clock', nasaRisk: 'Risk of Inadequate Sleep and Irregular Schedules',
    function: 'Recovery, memory, mood and immunity.',
    why: 'Chronic sleep loss, heavy workloads and disrupted body clocks affect health and safety. On ISS missions astronauts averaged about 6 hours of sleep despite 8.5 hours scheduled.',
    measure: 'Hours slept (log on waking). Pair with the reaction-time test.',
    actions: ['Protect the sleep window', 'Use timed light exposure', 'Dim screens before sleep', 'Eye mask and earplugs'],
    hazards: ['isolation', 'hostile'], indicators: ['sleep', 'pvt'], sources: ['hrpRisks', 'hazIsolation', 'sleepStudy'],
    levels: {
      simple: 'Sleep is your daily repair. HALO protects it.',
      crew: 'Sleep below your own baseline for several nights is HALO’s most common early warning.',
      surgeon: 'Self-reported/actigraphy sleep vs baseline; persistence ≥3 nights. Watch hypnotic use and next-day performance.',
    },
  },
  {
    id: 'sensorimotor', name: 'Balance & coordination', nasaRisk: 'Risk of Altered Sensorimotor and Vestibular Function',
    function: 'Balance, orientation, hand–eye coordination, walking.',
    why: 'Gravity transitions can cause motion sickness, dizziness, and problems with coordination and walking. Crews may need time to adjust after landing before critical tasks.',
    measure: 'Balance check (device motion sensors where available, otherwise guided self-rating).',
    actions: ['Do the balance check before EVA or landing', 'Move slowly after gravity changes', 'Use handholds'],
    hazards: ['gravity'], indicators: [], sources: ['hrpRisks', 'hazGravity'],
    levels: {
      simple: 'Your balance resets every time gravity changes.',
      crew: 'Check balance before any task where a fall or misstep matters.',
      surgeon: 'Sway proxy from device IMU is non-clinical; use as go/no-go aid only.',
    },
  },
]

export type Direction = 'high' | 'low' | 'both'

export interface Indicator {
  id: IndicatorId
  name: string
  short: string
  unit: string
  decimals: number
  concern: Direction
  systems: SystemId[]
  hazards: HazardId[]
  /** illustrative population threshold used for comparison (not medical advice) */
  population: { low?: number; high?: number }
  howTo: [string, string, string]
  why: string
  quick: number[]
  sources: string[]
}

export const INDICATORS: Indicator[] = [
  { id: 'hr', name: 'Resting heart rate', short: 'Heart rate', unit: 'bpm', decimals: 0, concern: 'both', systems: ['cardio'], hazards: ['gravity', 'distance', 'hostile'], population: { low: 45, high: 100 },
    howTo: ['Sit still for 2 minutes after waking.', 'Place two fingers on your wrist or use the cuff/strap.', 'Count beats for 30 seconds and double it.'],
    why: 'Cardiovascular adaptation to weightlessness; also rises with fever, stress and poor sleep.', quick: [52, 58, 64, 70, 78, 88], sources: ['hrpRisks'] },
  { id: 'sbp', name: 'Blood pressure (systolic)', short: 'BP sys', unit: 'mmHg', decimals: 0, concern: 'both', systems: ['cardio'], hazards: ['gravity'], population: { low: 90, high: 140 },
    howTo: ['Sit with your arm supported at heart level.', 'Wrap the cuff on bare upper arm, 2 cm above the elbow.', 'Stay silent and still while it inflates; log both numbers.'],
    why: 'Fluid shifts and vascular changes alter blood pressure regulation.', quick: [100, 108, 114, 120, 128, 136], sources: ['hrpRisks', 'hazGravity'] },
  { id: 'dbp', name: 'Blood pressure (diastolic)', short: 'BP dia', unit: 'mmHg', decimals: 0, concern: 'both', systems: ['cardio'], hazards: ['gravity'], population: { low: 60, high: 90 },
    howTo: ['Take with the systolic reading.', 'Use the lower number on the cuff display.', 'Repeat once if the first reading seems off.'],
    why: 'Paired with systolic to track vascular adaptation.', quick: [64, 70, 74, 78, 82, 88], sources: ['hrpRisks'] },
  { id: 'temp', name: 'Body temperature', short: 'Temp', unit: '°C', decimals: 1, concern: 'high', systems: ['immune'], hazards: ['hostile', 'distance'], population: { high: 38.0 },
    howTo: ['Measure before eating or drinking.', 'Place the probe under the tongue (or use the ear/forehead sensor).', 'Wait for the beep and log the value.'],
    why: 'Early sign of infection; immune changes in closed habitats.', quick: [36.4, 36.6, 36.8, 37.0, 37.4, 38.0], sources: ['hazHostile', 'hrpRisks'] },
  { id: 'glucose', name: 'Blood glucose', short: 'Glucose', unit: 'mg/dL', decimals: 0, concern: 'both', systems: ['cardio'], hazards: ['distance', 'gravity'], population: { low: 70, high: 140 },
    howTo: ['Wash and dry hands; prepare a test strip (or read your continuous glucose sensor).', 'Use the lancet on the side of a fingertip.', 'Touch the strip to the drop and log the reading.'],
    why: 'Metabolic health under reduced activity and changed diet. Continuous glucose monitors were validated aboard the ISS in 2025 (Ax-4), and CSA notes space research informs Type 2 diabetes studies on Earth.', quick: [82, 90, 96, 104, 115, 130], sources: ['axiomCgm', 'csaWhy'] },
  { id: 'sleep', name: 'Sleep', short: 'Sleep', unit: 'h', decimals: 1, concern: 'low', systems: ['sleep', 'brain'], hazards: ['isolation', 'hostile'], population: { low: 5.0 },
    howTo: ['On waking, note when you fell asleep and woke.', 'Subtract long awakenings.', 'Log the total hours.'],
    why: 'Sleep loss is pervasive in spaceflight and drives mood, alertness and immune changes.', quick: [5, 5.5, 6, 6.5, 7, 7.5], sources: ['sleepStudy', 'hrpRisks'] },
  { id: 'mood', name: 'Mood', short: 'Mood', unit: '/5', decimals: 0, concern: 'low', systems: ['brain'], hazards: ['isolation', 'radiation', 'distance'], population: { low: 2 },
    howTo: ['Pause and notice how you feel right now.', 'Pick 1 (very low) to 5 (great).', 'Optionally add one line to your private journal.'],
    why: 'Behavioural health is a top risk on long missions; journaling is used by NASA behavioural scientists.', quick: [1, 2, 3, 4, 5], sources: ['hazIsolation', 'hrpRisks'] },
  { id: 'exercise', name: 'Exercise', short: 'Exercise', unit: 'min', decimals: 0, concern: 'low', systems: ['msk', 'cardio'], hazards: ['gravity'], population: { low: 60 },
    howTo: ['Log resistance and aerobic minutes separately or combined.', 'Count only active time.', 'Log after each session.'],
    why: 'Exercise is the primary countermeasure for bone, muscle and cardiovascular deconditioning.', quick: [30, 60, 90, 120, 150, 180], sources: ['exerciseNtrs', 'boneBrief'] },
  { id: 'pvt', name: 'Reaction time', short: 'Reaction', unit: 'ms', decimals: 0, concern: 'high', systems: ['brain', 'sleep'], hazards: ['isolation', 'radiation'], population: { high: 400 },
    howTo: ['Open the Reaction test in a quiet moment.', 'Tap as soon as the counter appears.', 'Keep going for the full test; HALO logs your mean reaction time.'],
    why: 'Objective fatigue and alertness measure; NASA uses a short self-test of vigilance and attention.', quick: [240, 260, 280, 300, 330, 360], sources: ['bodyInSpace'] },
]

export const IND: Record<IndicatorId, Indicator> = Object.fromEntries(INDICATORS.map((i) => [i.id, i])) as Record<IndicatorId, Indicator>
export const SYS: Record<SystemId, BodySystem> = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, BodySystem>
export const HAZ: Record<HazardId, Hazard> = Object.fromEntries(HAZARDS.map((h) => [h.id, h])) as Record<HazardId, Hazard>

export interface Environment {
  id: EnvId
  name: string
  short: string
  /** one-way delay in seconds as a function of mission day */
  delayAt: (day: number) => number
  delayLabel: string
  gravity: string
  radiation: string
  doseFact: string
  emphasis: HazardId[]
  routines: string[]
  sources: string[]
}

export const ENVIRONMENTS: Environment[] = [
  { id: 'leo', name: 'ISS / Low Earth Orbit', short: 'ISS', delayAt: () => 0.5, delayLabel: '≈ real time',
    gravity: 'Weightless', radiation: 'Partly shielded by Earth’s magnetic field', doseFact: 'issDose', emphasis: ['gravity', 'isolation', 'hostile'],
    routines: ['Morning vitals', 'Exercise ×2', 'Evening mood check-in'], sources: ['ascendRad'] },
  { id: 'moon', name: 'Lunar surface base', short: 'Moon', delayAt: () => 8, delayLabel: '3–14 s',
    gravity: '≈1/6 g', radiation: 'No magnetic field or thick atmosphere', doseFact: 'lunarDose', emphasis: ['radiation', 'gravity', 'hostile'],
    routines: ['Morning vitals', 'Balance check before EVA', 'Exercise', 'Space-weather check'], sources: ['latencyReview'] },
  { id: 'mars', name: 'Mars transit', short: 'Mars', delayAt: (d) => Math.round(Math.min(20 * 60, 30 + (d / 180) ** 1.35 * 20 * 60)), delayLabel: 'grows to ~20 min',
    gravity: 'Weightless for ≈6 months, then ≈0.38 g', radiation: 'Deep space: galactic cosmic rays + solar storms', doseFact: 'cruiseDose', emphasis: ['distance', 'radiation', 'isolation'],
    routines: ['Morning vitals', 'Reaction test', 'Exercise ×2', 'Mood + journal', 'Weekly vision check'], sources: ['hazDistance', 'marsDelays', 'radCruise'] },
  { id: 'hera', name: 'HERA analog (Earth)', short: 'HERA', delayAt: () => 300, delayLabel: 'up to 5 min',
    gravity: '1 g (analog)', radiation: 'Earth-normal', doseFact: 'heraDelay', emphasis: ['isolation', 'distance', 'hostile'],
    routines: ['Morning vitals', 'Mood + journal', 'Exercise'], sources: ['hazDistance'] },
]
export const ENV: Record<EnvId, Environment> = Object.fromEntries(ENVIRONMENTS.map((e) => [e.id, e])) as Record<EnvId, Environment>

export type AutonomyMode = 'linked' | 'delayed' | 'autonomous'
/** Illustrative policy: NASA analog work found tele-surgery infeasible above ~1 s; HERA uses up to 5 min. */
export function autonomyFor(delaySec: number): AutonomyMode {
  if (delaySec <= 3) return 'linked'
  if (delaySec < 300) return 'delayed'
  return 'autonomous'
}

export function fmtDelay(s: number): string {
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`
  const m = Math.floor(s / 60), r = Math.round(s % 60)
  return `${m} min ${r.toString().padStart(2, '0')} s`
}
