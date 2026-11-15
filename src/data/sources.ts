// Single source of truth for every external source and every number shown in HALO.
// Rule: no number appears in the UI unless it is a FACT here (sourced) or is marked illustrative.

export type Org = 'NASA' | 'CSA' | 'NASA CCMC' | 'NASA-funded study' | 'Peer-reviewed' | 'Other' | 'Space Apps'

export interface Source {
  id: string
  title: string
  org: Org
  url: string
  /** Official challenge resource listed on the Space Apps challenge page */
  official?: boolean
}

export const SOURCES: Record<string, Source> = {
  hrpHazards: { id: 'hrpHazards', title: 'NASA HRP: 5 Hazards of Human Spaceflight', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazards/', official: true },
  hrpRisks: { id: 'hrpRisks', title: 'NASA HRP: Risks of Human Spaceflight', org: 'NASA', url: 'https://www.nasa.gov/hrp/risks/', official: true },
  hrpResearch: { id: 'hrpResearch', title: 'NASA HRP: Ongoing HRP Research in Space', org: 'NASA', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/', official: true },
  csaRadiation: { id: 'csaRadiation', title: 'CSA: Monitoring Radiation for Astronaut Health', org: 'CSA', url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp', official: true },
  csaWhy: { id: 'csaWhy', title: 'CSA: Why Do We Conduct Science Experiments in Space?', org: 'CSA', url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp', official: true },
  hazRadiation: { id: 'hazRadiation', title: 'NASA HRP Hazard: Space Radiation', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-space-radiation/' },
  hazIsolation: { id: 'hazIsolation', title: 'NASA HRP Hazard: Isolation and Confinement', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/' },
  hazDistance: { id: 'hazDistance', title: 'NASA HRP Hazard: Distance from Earth', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/' },
  hazGravity: { id: 'hazGravity', title: 'NASA HRP Hazard: Gravity Fields', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' },
  hazHostile: { id: 'hazHostile', title: 'NASA HRP Hazard: Hostile/Closed Environments', org: 'NASA', url: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/' },
  bodyInSpace: { id: 'bodyInSpace', title: 'NASA: The Human Body in Space', org: 'NASA', url: 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/' },
  radBrief: { id: 'radBrief', title: 'NASA OCHMO Technical Brief: Radiation Protection (NASA-STD-3001)', org: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' },
  ascendRad: { id: 'ascendRad', title: 'NASA NTRS: Simonsen et al., ASCEND space radiation paper (ISS dose rates)', org: 'NASA', url: 'https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf' },
  boneBrief: { id: 'boneBrief', title: 'NASA OCHMO Technical Brief: Bone Loss (OCHMO-TB-030)', org: 'NASA', url: 'https://nasa.gov/wp-content/uploads/2023/03/bone-loss-technical-brief-ochmo-1.pdf' },
  exerciseNtrs: { id: 'exerciseNtrs', title: 'NASA NTRS: ISS exercise countermeasures overview', org: 'NASA', url: 'https://ntrs.nasa.gov/api/citations/20090013286/downloads/20090013286.pdf' },
  marsDelays: { id: 'marsDelays', title: 'NASA Langley (NTRS): Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions', org: 'NASA', url: 'https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf' },
  latencyReview: { id: 'latencyReview', title: 'NASA NTRS: Communication latency literature review', org: 'NASA', url: 'https://ntrs.nasa.gov/citations/20250000703' },
  timeDelayOps: { id: 'timeDelayOps', title: 'NASA: Human-in-the-Loop Operations over Time Delay (analog lessons learned)', org: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2015/05/missionops_human_in_the_loop_over_time_delay_ops_lessons.pdf' },
  marsStorm: { id: 'marsStorm', title: 'NASA: NASA Watches Mars Light Up During Epic Solar Storm (10 June 2024)', org: 'NASA', url: 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm' },
  marsFacts: { id: 'marsFacts', title: 'NASA Science: Mars Facts', org: 'NASA', url: 'https://science.nasa.gov/mars/facts/' },
  starchildMars: { id: 'starchildMars', title: 'NASA GSFC StarChild: Facts about Mars (gravity 0.38 × Earth)', org: 'NASA', url: 'https://starchild.gsfc.nasa.gov/docs/StarChild/solar_system_level1/mars_facts.html' },
  rmgSol: { id: 'rmgSol', title: 'Royal Observatory Greenwich: How long is a day on Mars?', org: 'Other', url: 'https://www.rmg.co.uk/stories/topics/how-long-day-on-mars' },
  lunarDose: { id: 'lunarDose', title: 'Kiel University / Science Advances 2020: First measurements of the radiation dose on the lunar surface (Zhang et al.)', org: 'Peer-reviewed', url: 'https://www.sciencedaily.com/releases/2020/09/200926145212.htm' },
  axiomCgm: { id: 'axiomCgm', title: 'Axiom Space: Suite Ride research, first continuous glucose monitoring aboard the ISS (Ax-4, 2025)', org: 'Other', url: 'https://axiomspace.com/release/suite-ride-research-unlocks-potential-for-first-astronaut-with-diabetes' },
  radCruise: { id: 'radCruise', title: 'SwRI/NASA: Curiosity RAD radiation measured in transit to Mars (Zeitlin et al., Science 2013)', org: 'NASA-funded study', url: 'https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars' },
  donki: { id: 'donki', title: 'NASA CCMC DONKI: Space Weather Database Of Notifications, Knowledge, Information', org: 'NASA CCMC', url: 'https://ccmc.gsfc.nasa.gov/DONKI/' },
  donkiMove: { id: 'donkiMove', title: 'NASA CCMC announcement: DONKI API moved (Sept 2026)', org: 'NASA CCMC', url: 'https://ccmc.gsfc.nasa.gov/news/major-updates/' },
  sleepStudy: { id: 'sleepStudy', title: 'Barger et al. 2014, The Lancet Neurology: sleep deficiency in astronauts (NASA/NSBRI-funded)', org: 'NASA-funded study', url: 'https://www.eurekalert.org/news-releases/595450' },
  thirdQuarter: { id: 'thirdQuarter', title: 'Kanas et al. 2021, Whither the third quarter phenomenon? (Aerosp Med Hum Perform)', org: 'Peer-reviewed', url: 'https://asma.kglmeridian.com/downloadpdf/view/journals/amhp/92/8/article-p689.pdf' },
  judging: { id: 'judging', title: 'NASA Space Apps Judging & Awards Guide', org: 'Space Apps', url: 'https://www.spaceappschallenge.org/resources/judging-awards-guide/' },
}

export type FactKind = 'sourced' | 'illustrative'

export interface Fact {
  id: string
  label: string
  value: string
  kind: FactKind
  sources: string[]
  note?: string
}

/** Every number shown in HALO's UI lives here. */
export const FACTS: Record<string, Fact> = {
  careerLimit: { id: 'careerLimit', label: 'Career radiation limit (NASA-STD-3001)', value: '600 mSv', kind: 'sourced', sources: ['radBrief'], note: 'Universal for all ages and sexes.' },
  speLimit: { id: 'speLimit', label: 'Solar particle event limit (NASA-STD-3001)', value: '250 mSv per event', kind: 'sourced', sources: ['radBrief'] },
  issDose: { id: 'issDose', label: 'ISS effective dose rate', value: '≈0.2–0.5 mSv/day', kind: 'sourced', sources: ['ascendRad'] },
  cruiseDose: { id: 'cruiseDose', label: 'Measured GCR dose-equivalent rate in transit to Mars (Curiosity RAD, 2011–12)', value: '≈1.8 mSv/day', kind: 'sourced', sources: ['radCruise'], note: 'Measured inside the MSL cruise vehicle during low-to-moderate solar activity. HALO uses it as the Mars-transit daily rate; a crewed vehicle would differ.' },
  lunarDose: { id: 'lunarDose', label: 'Measured lunar surface dose equivalent (Chang’e-4 LND, Kiel University instrument)', value: '≈1.37 mSv/day (1,369 µSv/day)', kind: 'sourced', sources: ['lunarDose'], note: 'Galactic cosmic rays near solar minimum, about 2.6× the ISS dose measured over the same period; no solar particle events in the record.' },
  neutronShare: { id: 'neutronShare', label: 'Neutron share of total radiation on the ISS', value: '≈30%', kind: 'sourced', sources: ['csaRadiation'] },
  may20Dose: { id: 'may20Dose', label: 'Dose at Mars surface, 20 May 2024 storm (Curiosity RAD)', value: '8,100 µGy (≈30 chest X-rays)', kind: 'sourced', sources: ['marsStorm'], note: 'Measured under Mars’ thin atmosphere. NASA notes the dose rate in Mars orbit or deep space would be significantly higher.' },
  marsDelay: { id: 'marsDelay', label: 'Mars one-way communication delay', value: 'up to ~20 min (NASA HRP); 0–22 min over a mission (NASA Langley)', kind: 'sourced', sources: ['hazDistance', 'marsDelays'] },
  moonLatency: { id: 'moonLatency', label: 'Lunar one-way latency', value: '≈3–14 s total (light time alone ≈1.3 s)', kind: 'sourced', sources: ['latencyReview'] },
  heraDelay: { id: 'heraDelay', label: 'HERA analog communication delay', value: 'up to 5 min each way', kind: 'sourced', sources: ['hazDistance'] },
  telesurgery: { id: 'telesurgery', label: 'Tele-surgery limit (NASA analog testing)', value: 'not feasible above ≈1 s delay', kind: 'sourced', sources: ['timeDelayOps'] },
  boneLoss: { id: 'boneLoss', label: 'Weight-bearing bone mineral density loss', value: '1–1.5% per month', kind: 'sourced', sources: ['hazGravity'] },
  exerciseIss: { id: 'exerciseIss', label: 'ISS exercise prescription (historical)', value: '≈2.5 h/day, 6 days/week', kind: 'sourced', sources: ['exerciseNtrs', 'boneBrief'] },
  sleepIss: { id: 'sleepIss', label: 'Average sleep on ISS missions (8.5 h scheduled)', value: '6.09 h/night', kind: 'sourced', sources: ['sleepStudy'], note: '21 ISS astronauts; shuttle missions averaged 5.96 h.' },
  marsGravity: { id: 'marsGravity', label: 'Mars surface gravity', value: '0.38 g', kind: 'sourced', sources: ['starchildMars', 'hrpHazards'], note: 'NASA HRP rounds this to “three-eighths”.' },
  marsTransit: { id: 'marsTransit', label: 'Mars transit (weightless)', value: '≈6 months', kind: 'sourced', sources: ['hazGravity'] },
  marsSol: { id: 'marsSol', label: 'Mars solar day (sol)', value: '24 h 39 min 35 s (≈24.6 h)', kind: 'sourced', sources: ['marsFacts', 'rmgSol'], note: 'NASA gives ≈24.6 h; the sidereal day is 24 h 37 min 22 s.' },
  speArrival: { id: 'speArrival', label: 'Solar storm arrival at Mars, 20 May 2024', value: 'flare X-rays at light speed; charged particles within tens of minutes', kind: 'sourced', sources: ['marsStorm'] },
  cgmIss: { id: 'cgmIss', label: 'Glucose monitoring in orbit', value: 'continuous glucose monitors validated aboard the ISS (Ax-4, 2025)', kind: 'sourced', sources: ['axiomCgm'] },
  thirdQuarter: { id: 'thirdQuarter', label: 'Third-quarter phenomenon', value: 'reported in some analog studies, not universal', kind: 'sourced', sources: ['thirdQuarter'] },
  thresholds: { id: 'thresholds', label: 'Drift and triage thresholds', value: 'illustrative, not medical advice', kind: 'illustrative', sources: [] },
}

export function sourcesOf(ids: string[]): Source[] {
  return ids.map((i) => SOURCES[i]).filter(Boolean)
}
