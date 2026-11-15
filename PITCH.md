# HALO: pitch pack

## 7-slide demo (limit: 7 slides including title)

**1 · Title + problem**
HALO · Health Autonomy Loop for Orbit. "On a Mars mission, help can be 20 minutes away." Picture: the console screenshot with the comms delay chip. One line: astronauts must assess their own health; NASA lists five hazards (RIDGE) that drive the risks.

**2 · Insight**
"Your normal, not the average." Spaceflight shifts everyone's physiology (on ISS missions astronauts slept ~6 h despite 8.5 h scheduled), so a fixed population threshold misses real changes. Picture: Drift explorer with the personal band vs the dotted population line.

**3 · Solution**
Learn each astronaut's baseline → catch drift early (robust stats + persistence) → link it to a NASA hazard → triage offline → tell ground with the true delay. Picture: body map + "Why flagged?" drawer.

**4 · Live demo (60 s)**
The Mars Transit Story: sleep drift caught on day 51 (the fixed threshold never flagged it), real space-weather watch (day 84), solar storm shelter with a read-aloud checklist (day 90), autonomous fever triage at ~17 min delay (day 157), EVA NO-GO, and the Mission Debrief on day 180. Picture: the debrief card, or a QR code/link to the app.

**5 · NASA data & science**
Real NASA CCMC DONKI events (X8.7 flare 14 May 2024; 2,678 km/s CME 20 May 2024, the storm NASA measured at Mars). NASA-STD-3001 limits (600 mSv career, 250 mSv per SPE). NASA comms delays. NASA HRP hazards and risks. CSA radiation research. Every number has a source badge. Picture: radiation screen.

**6 · Impact + Earth spin-off**
Simulation Lab: across 1,000 seeded missions HALO caught 494/500 true declines vs 296/500 for a fixed threshold, median 12 days earlier (sensitivity under stated assumptions). Earth Mode: Antarctic stations, outback communities, remote clinics. Picture: lab histogram + Earth mode.

**7 · Trust + what's next**
Explainable rules, medkit-aware triage, hash-chained Health Black Box, accessibility (glove mode, contrast, reduced motion), offline, open synthetic dataset. Next: validate on NASA Standard Measures/analog data, Bluetooth sensors, voice, clinical review. Team + link.

## Slide-safe numbers (each verified against its source on 15 Nov 2026)
| Figure | Say it like this | Source |
|---|---|---|
| Career radiation limit | 600 mSv, the same for all ages and sexes | NASA-STD-3001 (OCHMO radiation brief) |
| Solar particle event limit | 250 mSv per event | NASA-STD-3001 (OCHMO radiation brief) |
| ISS dose | about 0.2–0.5 mSv/day | NASA NTRS, Simonsen et al. (ASCEND) |
| Neutrons | about 30% of total radiation on the ISS | CSA (official challenge resource) |
| Transit to Mars | 1.8 mSv/day measured by Curiosity's RAD in cruise | Zeitlin et al., Science 2013 (SwRI release) |
| Lunar surface | 1,369 µSv/day (≈1.37 mSv/day) measured | Zhang et al., Science Advances 2020 |
| 20 May 2024 storm at Mars | 8,100 µGy beside Curiosity, ≈30 chest X-rays; largest RAD surge since landing | NASA, “NASA Watches Mars Light Up…” |
| X8.7 flare, 14 May 2024 | largest flare in our DONKI set; CME 2,119–2,225 km/s; modelled Mars arrival 16–17 May | NASA CCMC DONKI (our files) |
| 20 May 2024 CME | fast halo CME, 1,927–2,678 km/s (two DONKI analyses), far-side source | NASA CCMC DONKI (our files) |
| DONKI cache | 181 flares, 144 CMEs, 27 SEP events | counted from our three DONKI exports |
| Mars delay | up to ~20 min one way (0–22 min over a mission) | NASA HRP Distance hazard; NASA Langley |
| Moon latency | 3–14 s one way (light time alone ≈1.3 s) | NASA NTRS latency review |
| HERA analog | up to 5 min each way | NASA HRP Distance hazard |
| Tele-surgery | not feasible above about 1 s delay | NASA analog lessons learned |
| Sleep | ISS crews averaged 6.09 h/night despite 8.5 h scheduled | Barger et al., Lancet Neurology 2014 |
| Bone | weight-bearing bones lose 1–1.5% mineral density per month | NASA HRP Gravity hazard |
| Mars gravity | 0.38 g (NASA HRP rounds to three-eighths; never say “one-third”) | NASA GSFC StarChild |
| Mars sol | 24 h 39 min 35 s (NASA: ≈24.6 h) | Royal Observatory Greenwich; NASA Mars Facts |
| Glucose in orbit | continuous glucose monitors validated aboard the ISS (Ax-4, 2025) | Axiom Space |
| Third quarter | “reported in some analog studies, not universal” | Kanas et al. 2021 |
| Simulation Lab | “Across 1,000 simulated missions, under stated assumptions, HALO caught 494/500 declines vs 296/500 for a fixed threshold, median 12 days earlier.” Always say *simulated* and *under stated assumptions*. | HALO's own synthetic data |
| Illustrative (never present as NASA facts) | drift/triage thresholds, health-index weights, go/no-go rules, +14 vs +45 mSv shelter figures, Mars delay curve, weekly checks | HALO design choices |

Say it out loud in the pitch: **“Real NASA space-weather events, simulated crew.”**

## Five talking points
1. **The problem is distance.** NASA says Mars delay can reach 20 minutes one way, and NASA analog testing found remote tele-surgery infeasible above about 1 second. The crew needs a copilot on board.
2. **Personal baseline beats population averages.** HALO flags change against *your* normal, with persistence so noise doesn't trigger alarms. In our scenario the fixed threshold never flagged the sleep decline HALO caught on day 51.
3. **NASA data drives the logic, not decoration.** Real DONKI space weather triggers the shelter protocol; NASA-STD-3001 limits drive the dose ledger; NASA's hazard and risk taxonomy shapes every screen.
4. **Autonomy that scales with distance.** Ground-linked on ISS, delayed assist on the Moon, autonomous on Mars: same app, behaviour set by the physics of the link.
5. **Built to be trusted.** Every flag explains itself, every number shows its source, triage is a readable rule tree that only uses what's in the medkit, and the Black Box is tamper-evident. Honest labels everywhere: simulated data, not a medical device.

## 30-second video script (if you choose video instead of slides)
- 0–5 s: Console. VO: "On the way to Mars, the doctor is twenty minutes away."
- 5–12 s: Press Play; sleep drift toast. VO: "HALO learns each astronaut's normal and catches drift early, here weeks before a fixed threshold would."
- 12–20 s: Day 90 shelter banner → radiation screen. VO: "Real NASA space-weather data from May 2024 triggers a storm-shelter protocol."
- 20–27 s: Day 157 triage. VO: "When Earth can't answer, HALO triages offline and queues the report."
- 27–30 s: Logo + "Powered by NASA data". VO: "HALO. Health autonomy for deep space, and remote Earth."
(Add English subtitles.)

## Screenshot checklist (1440×900)
- [ ] Console on day 57 (default after Reset demo): 2 alerts, CHI 78
- [ ] "Why flagged?" drawer for Sleep (shows "HALO first flagged this on day 51")
- [ ] Body Map with Sleep selected, "Flight surgeon" explanation level
- [ ] Drift & Forecast: forecast chart with both scenarios
- [ ] Day 90: console SPE banner, then Radiation screen with shelter checklist + map
- [ ] Day 157: Autonomous Triage showing fever rule + "HALO runs the protocol now"
- [ ] Ground Link with a packet in flight
- [ ] Simulation Lab results
- [ ] Health Black Box after "Tamper test" (chain broken)
- [ ] Earth Mode
- [ ] Judge Mode overlay (press J)
- [ ] EVA Go/No-Go on day 157 (NO-GO) and Landing readiness
- [ ] Sensors panel (camera pulse + Bluetooth strap, simulated)
- [ ] Mission Debrief on day 180 (best slide image)
- [ ] Phone view (390 px) with the slim header
- [ ] Glove mode on (⚙ → Glove mode)
(Ready-made screenshots are in halo-screenshots.zip.)

## Judge self-review: weaknesses and how we addressed them
| Criterion | Risk | Mitigation in HALO |
|---|---|---|
| Impact | "Only for astronauts" | Earth Mode + CSA-sourced Earth benefits; local framing (Antarctic, outback) |
| Creativity | "Another dashboard" | Personal-baseline drift + delay-aware autonomy + tamper-evident Black Box + real-storm story |
| Validity | Simulated data, invented thresholds | Every threshold labelled illustrative; 31 unit tests; Simulation Lab with visible assumptions; honest limitations |
| Relevance | NASA data as decoration | DONKI cache drives scenario + shelter; NASA-STD-3001 drives dose; RIDGE drives UI; provenance badges |
| Presentation | Too many features to show | Welcome card with 3 entry points, 60-s story ending in a debrief, 12-step Judge Mode, quick jumps to D90/D157 |
Remaining weaknesses to acknowledge if asked: no real crew data; Mars delay curve is illustrative; vision/balance checks are non-clinical.

## Submission checklist (deadline: Sun 15 Nov 2026, 11:59 pm Sydney)
- [ ] Every team member registered for the Sydney Local Event and listed on the Members tab
- [ ] Project page: title, summary, link to project (deployed app + GitHub repo), all required fields
- [ ] Demo link: 7 slides OR ≤30-s video with English subtitles, hosted publicly (Google Drive/YouTube/GitHub), anyone-with-link access
- [ ] NASA data & resources field: list items 1–3, 20 from REFERENCES.md; Space Agency Partner: CSA items 4–5
- [ ] References field: paste REFERENCES.md
- [ ] Tick both checkboxes (terms; original work + references)
- [ ] Click **Submit** and confirm the success banner. Submit early, before 10:30 pm.

## What changed in v3 (say this if asked “is it clinical?”)

- **Honest answer:** HALO is decision support, not a medical device. What is clinical-grade is the *reference layer*: every absolute threshold comes from a published guideline and cites it in the app.
- Blood pressure: AHA categories; crisis above 180 and/or 120 mmHg. Low BP: below 90/60 (NHLBI).
- Fever: measured 38.0 °C or more (CDC). Resting heart rate: 60–100 bpm.
- Glucose: ADA level 1 low 54–69, level 2 low under 54; time-in-range 70–180 mg/dL.
- Sleep: 7 h or more (AASM/SRS); ISS crews averaged 6.09 h.
- Alertness: NASA's 3-minute Reaction Self-Test protocol (PVT-B), lapse = 355 ms or more.
- Mood: PHQ-2, positive at 3 or more (a screen, not a diagnosis).
- Sensor trust: Bland–Altman agreement against the ANSI ±5 bpm / ±10% band.
- New: voice commands, Mars-sol planner (24 h 39 min 35 s), interactive 3D transfer view, installable offline app.
- Tests: 46 unit tests, 118 end-to-end checks, 0 accessibility violations in 29 states.
