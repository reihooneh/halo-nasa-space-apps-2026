# REFERENCES (paste into the Space Apps "References" field)

## NASA data & resources (official challenge resources)
1. NASA Human Research Program: 5 Hazards of Human Spaceflight. https://www.nasa.gov/hrp/hazards/
2. NASA Human Research Program: Risks of Human Spaceflight. https://www.nasa.gov/hrp/risks/
3. NASA Human Research Program: Ongoing HRP Research in Space. https://www.nasa.gov/hrp/ongoing-hrp-research/

## Space Agency Partner resources: CSA (Canadian Space Agency)
4. CSA: Monitoring Radiation for Astronaut Health (26 Feb 2026). https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
5. CSA: Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

## NASA data used directly
6. NASA Community Coordinated Modeling Center (CCMC), DONKI (Space Weather Database Of Notifications, Knowledge, Information). Solar flare (181), CME (144) and SEP (27) records exported for May–June 2024, bundled unchanged in data/raw/ as the app's default cache. https://ccmc.gsfc.nasa.gov/DONKI/ · API: https://ccmc.gsfc.nasa.gov/DONKI-API/get/
7. NASA CCMC announcement: DONKI API moved (Sept 2026). https://ccmc.gsfc.nasa.gov/news/major-updates/

## Additional NASA sources
8. NASA HRP Hazard: Space Radiation. https://www.nasa.gov/hrp/hazard-space-radiation/
9. NASA HRP Hazard: Isolation and Confinement. https://www.nasa.gov/hrp/hazard-isolation-and-confinement/
10. NASA HRP Hazard: Distance from Earth. https://www.nasa.gov/hrp/hazard-distance-from-earth/
11. NASA HRP Hazard: Gravity Fields. https://www.nasa.gov/hrp/hazard-gravity-fields/
12. NASA HRP Hazard: Hostile/Closed Environments. https://www.nasa.gov/hrp/hazard-hostile-closed-environments/
13. NASA: The Human Body in Space. https://www.nasa.gov/humans-in-space/the-human-body-in-space/
14. NASA OCHMO Technical Brief: Radiation Protection (NASA-STD-3001: 600 mSv career limit; 250 mSv per solar particle event). https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
15. NASA NTRS: Simonsen et al., ASCEND space radiation paper (ISS ≈0.2–0.5 mSv/day). https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf
16. NASA OCHMO Technical Brief: Bone Loss (OCHMO-TB-030). https://nasa.gov/wp-content/uploads/2023/03/bone-loss-technical-brief-ochmo-1.pdf
17. NASA NTRS: ISS exercise countermeasures overview. https://ntrs.nasa.gov/api/citations/20090013286/downloads/20090013286.pdf
18. NASA Langley (NTRS): Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions. https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf
19. NASA NTRS: Communication latency literature review (lunar 3–14 s). https://ntrs.nasa.gov/citations/20250000703
20. NASA: Human-in-the-Loop Operations over Time Delay, analog lessons learned (tele-surgery ~1 s). https://www.nasa.gov/wp-content/uploads/2015/05/missionops_human_in_the_loop_over_time_delay_ops_lessons.pdf
21. NASA: NASA Watches Mars Light Up During Epic Solar Storm (10 June 2024; 8,100 µGy at Mars surface on 20 May 2024). https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm
22. NASA Science: Mars Facts (≈24.6 h rotation, sols). https://science.nasa.gov/mars/facts/
23. NASA GSFC StarChild: Facts about Mars (gravity 0.38 × Earth). https://starchild.gsfc.nasa.gov/docs/StarChild/solar_system_level1/mars_facts.html

## Other scientific sources
24. Zeitlin et al. 2013, Science: Curiosity RAD measurements in transit to Mars, 1.8 mSv/day (SwRI press release; NASA mission). https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars
25. Barger et al. 2014, The Lancet Neurology: sleep deficiency in astronauts, 6.09 h/night on ISS vs 8.5 h scheduled (NASA/NSBRI-funded; Brigham and Women's Hospital release). https://www.eurekalert.org/news-releases/595450
26. Kanas, Gushin & Yusupova 2021, Aerospace Medicine and Human Performance 92(8): Whither the third quarter phenomenon? https://asma.kglmeridian.com/downloadpdf/view/journals/amhp/92/8/article-p689.pdf
27. Zhang et al. 2020, Science Advances 6(39): First measurements of the radiation dose on the lunar surface, 1,369 µSv/day (Kiel University release). https://www.sciencedaily.com/releases/2020/09/200926145212.htm
28. Royal Observatory Greenwich: How long is a day on Mars? (solar day 24 h 39 min 35 s). https://www.rmg.co.uk/stories/topics/how-long-day-on-mars
29. Axiom Space: Suite Ride research, first continuous glucose monitoring of crew aboard the ISS (Ax-4, 2025). https://axiomspace.com/release/suite-ride-research-unlocks-potential-for-first-astronaut-with-diabetes
30. NASA Space Apps Judging & Awards Guide 2026. https://www.spaceappschallenge.org/resources/judging-awards-guide/

## Software libraries (open source)
- React 18.3.1 and React DOM (MIT). https://react.dev
- Recharts 3.10.1 (MIT). https://recharts.org
- Framer Motion 14.14.0 (MIT). https://www.framer.com/motion/
- Lucide React icons 1.73.0 (ISC). https://lucide.dev
- Tailwind CSS 3.4.19 (MIT), PostCSS 8.5 (MIT), Autoprefixer 10.6 (MIT)
- Vite 6.4.6 (MIT), @vitejs/plugin-react 4.7 (MIT), vite-plugin-singlefile 2.3.4 (MIT)
- TypeScript (Apache-2.0)
- Testing only (not shipped): Vitest 3.2.7 (MIT), Playwright 1.65 (Apache-2.0), axe-core (MPL-2.0)

## Web platform APIs used (built into browsers)
- MediaDevices.getUserMedia (camera pulse estimate), Web Bluetooth GATT Heart Rate service (0x180D / 0x2A37), Web Speech API speechSynthesis (spoken protocols), DeviceMotion (balance check).

## Fonts (bundled, no CDN)
- Inter (variable) by Rasmus Andersson / The Inter Project Authors, SIL Open Font License 1.1, via @fontsource-variable/inter 5.3.0. https://rsms.me/inter/
- JetBrains Mono by JetBrains, SIL Open Font License 1.1, via @fontsource/jetbrains-mono 5.3.0. https://www.jetbrains.com/lp/mono/

## Images, icons, media
- All graphics (logo, body figure, hero scenes, spacecraft/Earth link diagram, shelter map, charts) are original inline SVG/code made for this project.
- Icons: Lucide (ISC). No photographs, NASA logos/insignia, music or third-party images are used.

## Algorithms
- SHA-256 implemented from the public FIPS 180-4 specification.
- mulberry32 PRNG (public-domain algorithm).
- Median absolute deviation (MAD) robust statistics; exponentially weighted moving average (EWMA).
- Remote photoplethysmography (green-channel pulse estimation) with a direct discrete Fourier transform; RMSSD heart-rate variability.
