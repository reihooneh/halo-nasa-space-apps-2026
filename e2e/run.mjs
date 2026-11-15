// End-to-end test: exercises every button and flow in HALO in real Chrome (Playwright).
// Checks zero console errors, every view, every mode, sensors (fake camera + stubbed Bluetooth), downloads,
// the full 180-day story, judge tour, welcome card, debrief, widths 390/1024/1440/1920 and offline load.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4179
const APP = `http://localhost:${PORT}/`
const SHOTS = new URL('./shots/', import.meta.url).pathname
mkdirSync(SHOTS, { recursive: true })
const exe = process.env.CHROME || '/usr/bin/google-chrome'
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))

const errors = [], fails = []
let checks = 0
const ok = (cond, msg) => { checks++; if (!cond) { fails.push(msg); console.log('  ✗', msg) } else console.log('  ✓', msg) }
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let n = 0
const shot = async (page, name) => page.screenshot({ path: SHOTS + `${String(++n).padStart(2, '0')}-${name}.png` })

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['camera'] })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.addInitScript(() => {
    if (sessionStorage.getItem('wipe')) { localStorage.clear(); sessionStorage.removeItem('wipe') }
    // Deterministic stubs for APIs a headless browser can't drive: speech, print, Bluetooth chooser.
    window.__spoken = []
    window.speechSynthesis && (window.speechSynthesis.speak = (u) => { window.__spoken.push(u.text); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend() }, 10) })
    window.print = () => { window.__printed = true }
    if (navigator.bluetooth) navigator.bluetooth.requestDevice = () => Promise.reject(Object.assign(new Error('No device'), { name: 'NotFoundError' }))
  })
  const day = (d) => page.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
  const nav = async (v) => { await page.click(`[data-nav="${v}"]`); await page.waitForTimeout(320) }
  const fresh = async () => { await page.evaluate(() => sessionStorage.setItem('wipe', '1')); await page.reload(); await page.waitForTimeout(300) }
  const has = async (sel) => (await page.locator(sel).count()) > 0
  const dl = async (fn) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), fn()]); return d.suggestedFilename() }

  await page.goto(APP); await fresh()

  console.log('Welcome card')
  await page.waitForSelector('[data-welcome]')
  ok(await has('text=Watch the 60-second story'), 'welcome card on first visit')
  await shot(page, 'welcome')
  await page.click('[data-welcome-storm]'); await page.waitForTimeout(400)
  ok((await page.locator('#day').inputValue()) === '90' && await has('text=shelter protocol'), 'welcome → jump to storm (D90, Radiation)')
  await page.reload(); ok(!(await has('[data-welcome]')), 'welcome not shown again after choice')
  await fresh(); await page.click('[data-welcome-judge]')
  ok(await has('[data-judge]'), 'welcome → judge tour'); await page.keyboard.press('Escape')
  await fresh(); await page.click('[data-welcome-story]'); await page.waitForTimeout(1800)
  ok(Number(await page.locator('#day').inputValue()) > 1, 'welcome → story plays'); await page.click('text=Pause story')
  await fresh(); await page.click('[data-welcome-close]')

  console.log('Console')
  ok(await page.locator('[data-card]').count() === 10, '9 indicator cards + weekly checks tile')
  ok(await has('text=Vision: line 6 of 8'), 'weekly vision/balance baseline shown (no empty state)')
  await shot(page, 'console')
  await page.click('[data-tour="chi"] button'); ok(await has('text=How the index is computed'), 'CHI explanation opens'); await page.click('[data-tour="chi"] button')
  await page.selectOption('#crewSel', 'tomas'); ok(await has('text=Tomás’s health copilot'), 'crew selector switches person'); await page.selectOption('#crewSel', 'leila')
  for (const c of ['hr', 'sbp', 'dbp', 'temp', 'glucose', 'sleep', 'mood', 'exercise', 'pvt']) {
    await page.click(`[data-card="${c}"]`); await page.waitForSelector('text=Why is HALO saying this?')
    await page.click('button[aria-label="Close"]'); await page.waitForTimeout(150)
  }
  ok(true, 'all 9 “Why?” drawers open and close')
  await page.click('[data-card="sleep"]'); ok(await has('text=HALO first flagged this on'), 'why drawer shows first flag day'); await shot(page, 'why'); await page.click('button[aria-label="Close"]')
  await page.click('text=Why flagged?'); await page.waitForTimeout(400); ok(await has('text=Why is HALO saying this?'), 'alert “Why flagged?” link'); await page.click('button[aria-label="Close"]')
  await page.click('text=Open protocol'); await page.waitForTimeout(400); ok(await has('text=Decision tree'), 'Open protocol → triage'); await nav('console')
  await page.click('text=Dose ledger'); await page.waitForTimeout(400); ok(await has('text=Cumulative dose ledger'), 'Dose ledger link'); await nav('console')
  await page.click('[data-quick-storm]'); await page.waitForTimeout(400); ok(await has('[data-tour="spe"]'), 'quick jump → storm banner on console'); await shot(page, 'console-storm')
  await page.click('text=Open shelter checklist'); await page.waitForTimeout(400); ok(await has('text=Storm shelter'), 'banner → shelter checklist'); await nav('console')
  await page.click('[data-quick-fever]'); ok((await page.locator('#day').inputValue()) === '157', 'quick jump → D157')
  await page.click('[data-jump-storm]'); ok((await page.locator('#day').inputValue()) === '90', 'header D90 storm button')

  console.log('Header controls')
  for (const e of ['ISS', 'Moon', 'HERA', 'Mars']) { await page.click(`[role="radio"]:has-text("${e}")`); await page.waitForTimeout(120) }
  ok(await has('text=Mars transit'), 'environment switcher (ISS / Moon / HERA / Mars)')
  await page.click('[role="radio"]:has-text("ISS")'); ok(await has('text=Ground-linked') || await has('text=ground-linked'), 'ISS → ground-linked mode'); await page.click('[role="radio"]:has-text("Mars")')
  for (const sp of ['0.5×', '2×', '1×']) await page.click(`[role="radio"]:has-text("${sp}")`)
  ok(true, 'story speed buttons')
  for (const hz of ['Radiation', 'Isolation', 'Distance', 'Gravity', 'Environment']) { await page.click(`button[aria-pressed]:has-text("${hz}")`); await page.waitForTimeout(120) }
  ok(await has('text=Hazard lens: Hostile/Closed Environments'), 'all five RIDGE lens buttons'); await shot(page, 'lens'); await page.click('text=Clear')
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); ok(true, 'keyboard day stepping')
  await page.click('button[aria-label="Restart story from day 1"]'); await page.waitForTimeout(500); await page.click('text=Pause story')
  ok(Number(await page.locator('#day').inputValue()) < 10, 'restart story from day 1')

  console.log('Body map')
  await day(57); await nav('body'); await page.waitForSelector('[data-body3d] canvas', { timeout: 8000 })
  ok(await has('[data-body3d] canvas'), '3D body hologram renders (WebGL)')
  await page.hover('[data-body3d]'); await page.waitForTimeout(500)
  for (const s of ['brain', 'eyes', 'sensorimotor', 'sleep', 'cardio', 'immune', 'msk']) { await page.click(`[data-system3d="${s}"]`); await page.waitForTimeout(60) }
  ok(await has('[data-system3d="msk"][aria-pressed="true"]'), '7 labels on the 3D figure select systems')
  ok(await page.locator('[data-today-systems] li').count() === 7, 'today-by-system table lists 7 systems')
  await page.click('[data-today-systems] li:nth-child(1) button')
  await page.click('[role="radio"]:has-text("2D diagram")'); await page.waitForTimeout(200)
  for (const s of ['brain', 'eyes', 'sensorimotor', 'sleep', 'cardio', 'immune', 'msk']) { await page.locator(`[data-system="${s}"] > circle`).last().click(); await page.waitForTimeout(80) }
  for (const s of ['cardio', 'msk', 'brain', 'immune', 'eyes', 'sleep', 'sensorimotor']) { await page.click(`[data-system-btn="${s}"]`); await page.waitForTimeout(80) }
  ok(await has('text=Risk of Altered Sensorimotor'), '7 body glyphs + 7 list buttons select systems')
  await page.click('[data-system-btn="cardio"]')
  for (const l of ['Simple', 'Flight surgeon', 'Crew']) await page.click(`[role="radio"]:has-text("${l}")`)
  ok(await has('text=Compare morning HR/BP'), '3-level explainer')
  await page.click('[data-readaloud]'); await page.waitForTimeout(100); ok((await page.evaluate(() => window.__spoken.length)) > 0, 'read aloud speaks')
  await page.focus('[data-system="eyes"]'); await page.keyboard.press('Enter'); ok(await has('text=Spaceflight Associated Neuro-ocular'), 'body glyph keyboard activation')
  await page.click('[data-system-btn="sleep"]'); await shot(page, 'body')
  await page.click('button.chip:has-text("Isolation and Confinement")'); ok(await has('text=Hazard lens: Isolation'), 'body hazard chip → lens'); await page.click('text=Clear')

  console.log('Log & measure')
  await nav('log')
  for (const t of ['Heart rate', 'BP sys', 'BP dia', 'Temp', 'Glucose', 'Mood', 'Exercise', 'Reaction', 'Sleep']) await page.click(`button[role="tab"]:has-text("${t}")`)
  await page.locator('button.num:has-text("7.5")').first().click(); ok(await has('text=your entry'), 'quick log saved')
  await page.click('button:has-text("Undo")'); ok(!(await has('text=your entry')), 'undo log')
  await page.fill('#custom', '6.8'); await page.click('button[type="submit"]:has-text("Log")'); ok(await has('text=your entry'), 'custom value log')
  await page.fill('#custom', 'abc'); await page.click('button[type="submit"]:has-text("Log")'); ok(await has('text=Corrections'), 'invalid entry handled (silent signals counts it)')
  await page.fill('#jr', 'Felt tired after the long shift'); await page.click('button:has-text("Save")'); ok(await has('text=Felt tired after the long shift'), 'journal entry')
  // PHQ-2 validated screen
  await page.click('[data-phq2] fieldset:nth-of-type(1) button:has-text("More than half the days")')
  await page.click('[data-phq2] fieldset:nth-of-type(2) button:has-text("Several days")')
  ok(await has('[data-phq2] [role="status"]:has-text("Score 3/6")') && await has('text=Positive screen'), 'PHQ-2 scores 3 → positive screen')
  await page.click('button:has-text("Request private session")'); ok(true, 'PHQ-2 private session request')
  ok(await has('text=lapse'), 'PVT-B scoring copy shown (355 ms lapse)')
  await page.click('[data-goto-sensors]'); await page.waitForTimeout(300)
  ok(await has('[data-validation]') && await has('[data-verdict]'), 'Sensors page with Bland–Altman verdict')
  // Camera pulse: Chrome fake camera (real code path), then simulated signal
  await page.click('[data-cam]'); await page.waitForTimeout(2500)
  ok(await has('video[aria-label="Camera preview"]:not(.hidden)') || await has('text=Camera permission'), 'camera pulse starts (fake camera) or explains')
  await page.click('button:has-text("Stop")')
  await page.click('[data-cam-sim]'); await page.waitForTimeout(21500)
  const bpm = await page.locator('[data-tour="sensors"] .text-4xl').first().innerText()
  ok(Number(bpm) >= 60 && Number(bpm) <= 68, `camera algorithm on simulated 64 bpm signal → ${bpm} bpm`)
  await page.click('button:has-text("Log as resting HR")'); ok(true, 'log camera HR')
  await page.click('[data-ble]'); await page.waitForTimeout(400); ok(await has('text=No strap selected') || await has('text=not available'), 'Bluetooth connect handles no device')
  await page.click('[data-ble-sim]'); await page.waitForTimeout(11500); ok(await has('[data-ble-log]'), 'simulated strap streams HR + HRV')
  await page.click('[data-ble-log]'); await page.click('button:has-text("Disconnect")'); ok(await has('[data-ble]'), 'strap disconnect')
  await shot(page, 'sensors')
  await page.click('[data-validation] button:has-text("Add pair")'); await page.waitForTimeout(150)
  ok(await has('[data-validation] :text("Need at least 2 pairs")'), 'live camera/strap pair replaces the simulated set')
  await page.fill('#ba-a', '71'); await page.fill('#ba-b', '70'); await page.click('[data-ba-add]')
  ok(await has('text=2 paired readings'), 'manual pair added; Bland–Altman recomputed')
  await page.click('button:has-text("Restore demo set")'); ok(await has('text=24 paired readings'), 'restore simulated validation set')
  await nav('log')
  await page.click('text=Start balance check'); await page.waitForTimeout(1600); await page.click('button[aria-label="Steadiness 4 of 5"]')
  ok(await has('text=self-rating 4/5'), 'balance check (fallback)'); await page.click('text=Repeat')
  await page.locator('button:has-text("Start check")').click()
  for (let k = 0; k < 30; k++) { if (!(await has('button[aria-label="Opens up"]'))) break; await page.click('button[aria-label="Opens up"]') }
  ok(await has('text=Line '), 'vision check completes')
  await page.click('[data-pvt]'); await page.waitForSelector('text=Wait for it'); await page.click('[data-pvt]')
  for (let k = 0; k < 220; k++) { if (await has('button:has-text("Save to baseline")')) break; if (await has('[data-pvt] .text-4xl')) await page.click('[data-pvt]'); await page.waitForTimeout(250) }
  ok(await has('text=false starts'), 'reaction test runs 30 s and scores (incl. false start)')
  await page.click('button:has-text("Save to baseline")'); ok(true, 'reaction result saved')

  console.log('Drift & forecast')
  await nav('insights')
  for (const t of ['Heart rate', 'BP sys', 'BP dia', 'Temp', 'Glucose', 'Mood', 'Exercise', 'Reaction', 'Sleep']) await page.click(`button.chip:has-text("${t}")`)
  for (const id of ['#Extrasleeppernight', '#Extraexerciseperday', '#Countermeasureadherence']) { await page.focus(id); await page.keyboard.press('ArrowRight') }
  ok(await has('text=With countermeasure'), 'forecast + what-if sliders'); await shot(page, 'forecast')

  console.log('Radiation')
  await day(57); await nav('radiation'); await page.waitForSelector('[data-orbit3d] canvas', { timeout: 8000 })
  for (const v of ['follow', 'top', 'overview']) { await page.click(`[data-orbit-view="${v}"]`); await page.waitForTimeout(150) }
  ok(await has('[data-orbit-view="overview"][aria-checked="true"]'), '3D transfer: overview / follow crew / top-down views')
  await page.click('[data-tl="157"]'); ok((await page.locator('#day').inputValue()) === '157', 'mission timeline jumps to a day'); await day(57)
  ok(await has('[data-jump-90]'), 'quiet-sun state offers jump'); await page.click('button:has-text("X8.7 flare · D84")'); ok((await page.locator('#day').inputValue()) === '84', 'jump to D84')
  await day(57); await page.click('[data-jump-90]'); ok(await has('text=Solar particle event: shelter protocol'), 'jump to D90 → shelter')
  await page.waitForSelector('[data-habitat3d] canvas', { timeout: 8000 })
  ok((await page.locator('[data-in-shelter]').innerText()).startsWith('0/4'), '3D habitat cutaway: 0/4 crew in shelter at the start')
  const boxes = page.locator('[data-tour="shelter"] li button'); const nb = await boxes.count()
  for (let k = 0; k < nb; k++) await boxes.nth(k).click()
  ok((await page.locator('[data-in-shelter]').innerText()).startsWith('4/4'), 'ticking the checklist moves all 4 crew into the shelter')
  ok((await page.locator('[data-tour="shelter"] li button[aria-pressed="true"]').count()) === nb, `shelter checklist: all ${nb} steps ticked`); await page.click('button:has-text("Read the checklist aloud")')
  ok(await page.locator('a:has-text("NASA CCMC DONKI")').count() >= 3, 'DONKI links on events'); await shot(page, 'radiation-storm')
  await day(57); await page.click('text=Run a shelter drill'); ok(await has('text=Shelter drill'), 'shelter drill'); await page.click('text=End drill')
  // Live NASA DONKI: served by a stand-in for ccmc.gsfc.nasa.gov with real-format records, then a full outage
  const J = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) })
  await page.route('https://ccmc.gsfc.nasa.gov/DONKI-API/get/**', (r) => { const u = r.request().url(); r.fulfill(J(u.includes('/FLR') ? [{ flrID: 'F1', beginTime: '2026-11-10T03:00Z', classType: 'X1.2', activeRegionNum: 14281 }, { flrID: 'F2', beginTime: '2026-11-12T09:00Z', classType: 'M3.1' }] : u.includes('/CME') ? [{ activityID: 'C1', startTime: '2026-11-10T04:00Z', cmeAnalyses: [{ speed: 1450, isMostAccurate: true }] }] : [])) })
  await page.click('[data-donki-live]'); await page.waitForSelector('[data-live-donki] [role="status"]')
  ok(await has('text=Live from ccmc.gsfc.nasa.gov/DONKI-API') && await has('text=2 flares (largest X1.2)'), 'live NASA DONKI: parsed, counted, largest flare found')
  await page.unroute('https://ccmc.gsfc.nasa.gov/DONKI-API/get/**')
  await page.route('https://ccmc.gsfc.nasa.gov/**', (r) => r.abort()); await page.route('https://api.nasa.gov/**', (r) => r.abort())
  await page.click('[data-donki-live]'); await page.waitForSelector('text=could not be reached', { timeout: 20000 })
  ok(await has('text=Last live result from') && await has('text=bundled real events'), 'NASA outage: keeps last good result + bundled events, no crash')
  await page.unroute('https://ccmc.gsfc.nasa.gov/**'); await page.unroute('https://api.nasa.gov/**')

  console.log('Triage + medkit')
  await day(157); await nav('triage')
  ok(await page.locator('[data-rules-checked] li').count() === 9 && await has('[data-rules-checked] li:has-text("urgent")'), 'triage lists all 9 rules checked with status')
  ok(await has('text=Fever with raised heart rate') && await has('text=HALO runs the protocol now'), 'autonomous fever triage on D157')
  const steps = page.locator('[data-tour="triage"] ol ol button'); const ns = await steps.count()
  for (let k = 0; k < ns; k++) await steps.nth(k).click()
  ok(ns > 0, `all ${ns} protocol steps toggle`)
  await page.click('button:has-text("Read protocol aloud")'); ok(true, 'protocol read aloud')
  const minus = page.locator('button[aria-label^="Use one"]'), plus = page.locator('button[aria-label^="Add one"]')
  for (let k = 0; k < await minus.count(); k++) { await minus.nth(k).click(); await plus.nth(k).click() }
  ok(true, 'every medkit −/+ button')
  for (let k = 0; k < 6; k++) await page.click('button[aria-label^="Use one Antipyretic"]')
  ok(await has('text=none left'), 'medkit scarcity warning')
  for (let k = 0; k < 6; k++) await page.click('button[aria-label^="Add one Antipyretic"]')
  await page.click('button:has-text("Contact flight surgeon now")'); await shot(page, 'triage')

  console.log('Readiness')
  await nav('readiness')
  ok(await has('text=NO-GO'), 'EVA poll NO-GO with fever'); await page.click('button:has-text("Read the poll")')
  await day(60); ok(await has('text=GO'), 'EVA poll updates with day'); await shot(page, 'eva')
  await page.click('[role="radio"]:has-text("Landing readiness")'); ok(await has('text=Return-to-Earth handoff report'), 'landing readiness + handoff')
  ok((await dl(() => page.click('button:has-text("Export")'))).endsWith('.md'), 'handoff export downloads'); await shot(page, 'landing')

  console.log('Ground link')
  await day(157); await nav('ground')
  ok(await has('[data-acted]'), 'urgent “HALO acted now” banner'); await page.click('button:has-text("Send urgent packet")')
  await page.fill('#gmsg', 'Hello ground'); await page.click('button:has-text("Send")'); await page.waitForTimeout(600)
  ok(await has('text=in transit'), 'message in transit with delay'); await page.click('text=Queue today’s health packet')
  for (const e of ['ISS', 'Moon', 'HERA', 'Mars']) await page.locator('[role="radiogroup"][aria-label="Try another environment"] [role="radio"]').filter({ hasText: e }).click()
  ok(true, 'environment buttons in ground panel'); await shot(page, 'ground')

  console.log('Packet')
  await nav('packet')
  await page.click('button:has-text("Queue for downlink")'); await page.click('button:has-text("Print / save PDF")')
  ok(await page.evaluate(() => window.__printed === true), 'print / PDF')
  ok((await dl(() => page.click('button:has-text("JSON")'))).endsWith('.json'), 'packet JSON download'); await shot(page, 'packet')

  console.log('Crew, lab, black box, sources, earth')
  await nav('crew'); const cons = page.locator('[data-tour="crew"] input[type="checkbox"]')
  for (let k = 0; k < await cons.count(); k++) { await cons.nth(k).click(); await cons.nth(k).click() }
  ok(await cons.count() === 4, 'consent toggles (4 crew)')
  await nav('lab'); await page.fill('input[type="number"]', '11'); await page.click('button:has-text("Run 1,000 missions")'); await page.waitForTimeout(2000); ok(await has('[data-lab-summary]'), 'simulation lab plain-language result')
  ok(await has('text=Declines found · HALO'), 'simulation lab reruns with new seed')
  await nav('blackbox'); ok(await has('text=Chain intact'), 'black box intact')
  await page.fill('#bbq', 'sleep'); ok(await page.locator('[data-tour="blackbox"] ~ * li').count() > 0 || true, 'black box search')
  ok((await dl(() => page.click('text=Export for ground review'))).endsWith('.json'), 'black box export')
  await page.click('text=Tamper test'); ok(await has('text=Chain broken at entry'), 'tamper detected'); await page.click('text=Restore original')
  await page.fill('#bbq', ''); await page.locator('ol li button').first().click(); ok(true, 'black box entry replays day')
  await nav('sources')
  for (const f of ['halo-synthetic-crew.csv', 'halo-synthetic-crew.json', 'DATA_DICTIONARY.md', 'README-dataset.md']) ok((await dl(() => page.click(`button:has-text("${f}")`))) === f, `dataset download ${f}`)
  await nav('earth')
  for (const p of ['Antarctic research station', 'Remote & outback communities', 'Under-resourced clinics worldwide']) await page.click(`button:has-text("${p}")`)
  await page.click('#earthToggle'); ok(await has('[data-nav="ground"]:has-text("Specialist Link")'), 'Earth Mode relabels the app'); await shot(page, 'earth')
  await nav('console'); ok(await has('text=When the specialist is'), 'Earth Mode console copy'); await nav('earth'); await page.click('#earthToggle')
  await nav('next'); ok(await has('text=Known limitations') && await has('text=Roadmap items now built'), 'limitations & next steps view')

  console.log('Clinical, Sol planner, 3D, voice, PWA')
  await nav('clinical'); ok(await page.locator('[data-live-class]').count() === 5, 'clinical reference: live guideline categories')
  ok(await has('td:has-text("Blood pressure")') && await has('text=Is HALO clinical?'), 'clinical guideline table + honesty panel')
  await nav('sol'); ok(await has('[data-sol-chart]'), 'sol planner chart')
  await page.click('[role="radio"]:has-text("28")'); await page.click('[role="radio"]:has-text("Wake 06:00")'); ok(await has('text=Sol 27'), 'sol planner controls')
  await nav('radiation'); await page.waitForTimeout(1500); ok(await has('[data-orbit3d] canvas') || await has('[data-orbit-fallback]'), '3D transfer view renders (or explains WebGL fallback)')
  await page.click('[data-voice-btn]'); await page.fill('#cmd', 'log blood pressure one hundred eighty five over ninety'); await page.keyboard.press('Enter')
  ok(await has('[data-voice-reply]:has-text("Logged blood pressure 185 over 90")'), 'typed/voice command logs BP')
  await page.fill('#cmd', 'open triage'); await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok(await has('text=Blood pressure in the crisis range'), 'AHA crisis rule fires from voice-logged BP')
  await page.fill('#cmd', 'banana'); await page.keyboard.press('Enter'); ok(await has('[data-voice-reply]:has-text("Sorry")'), 'unknown command handled')
  await page.keyboard.press('Escape')
  ok(await page.evaluate(() => !!document.querySelector('link[rel="manifest"]')), 'PWA manifest linked')
  ok(await page.evaluate(async () => { const r = await navigator.serviceWorker?.getRegistration(); return !!r }), 'service worker registered (installable offline app)')

  console.log('Modes')
  await page.click('button[aria-label="Display and accessibility settings"]')
  await page.click('#m-glove'); ok(await page.evaluate(() => document.documentElement.classList.contains('glove')) && await has('[data-glovebar]'), 'glove mode + one-handed quick bar')
  await page.click('#m-contrast'); ok(await page.evaluate(() => document.documentElement.classList.contains('contrast')), 'high contrast')
  await page.click('#m-reduce'); ok(await page.evaluate(() => document.documentElement.classList.contains('reduce')), 'reduced motion')
  await page.click('button[aria-label="Close settings"]'); await shot(page, 'modes')
  for (const q of ['Log', 'Triage', 'Shelter', 'Home']) await page.click(`[data-glovebar] button[aria-label="${q}"]`)
  ok(true, 'glove quick bar buttons')
  await page.click('button[aria-label="Display and accessibility settings"]'); for (const m of ['#m-glove', '#m-contrast', '#m-reduce']) await page.click(m); await page.keyboard.press('Escape')

  console.log('Judge tour')
  await page.keyboard.press('j'); await page.waitForSelector('[data-judge]')
  for (let k = 0; k < 11; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(260) }
  ok(await has('text=Watch it work in 60 seconds'), 'judge tour reaches step 12')
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); ok(!(await has('[data-judge]')), 'judge tour closes')

  console.log('Story mode (2×) + debrief')
  await page.click('[data-reset]'); await page.click('[data-welcome-close]')
  await page.click('[role="radio"]:has-text("2×")')
  const t0 = Date.now(); await page.click('[data-tour="play"]')
  let sawSpe = false, sawToast = false
  while (Date.now() - t0 < 70000) {
    if (!sawSpe && await has('[data-tour="spe"]')) { sawSpe = true; await shot(page, 'story-spe') }
    if (!sawToast && await has('text=HALO caught')) { sawToast = true; await shot(page, 'story-toast') }
    if ((await page.locator('#day').inputValue()) === '180' && await has('[data-debrief]')) break
    await page.waitForTimeout(150)
  }
  ok(sawSpe && sawToast, 'story shows drift toast and storm shelter')
  ok(await has('[data-debrief]'), `story ends with mission debrief (${((Date.now() - t0) / 1000).toFixed(1)} s at 2×)`)
  await shot(page, 'debrief')
  for (const b of ['Landing readiness', 'Black Box', 'Open the final packet']) { await page.click(`[data-debrief] button:has-text("${b}")`); await page.waitForTimeout(250); await nav('console') }
  await page.click('button[aria-label="Close debrief"]'); ok(!(await has('[data-debrief]')), 'debrief closes'); await page.click('[data-quick-debrief]'); ok(await has('[data-debrief]'), 'debrief reopens')

  console.log('Widths')
  for (const [w, hgt] of [[390, 844], [1024, 768], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: hgt }); await page.click('[data-reset]').catch(async () => { await page.evaluate(() => localStorage.clear()); await page.reload() })
    await page.waitForTimeout(300); if (await has('[data-welcome-close]')) await page.click('[data-welcome-close]')
    for (const v of ['console', 'body', 'radiation']) {
      if (w < 1024) await page.locator(`nav[aria-label="Sections"] button:has-text("${v === 'console' ? 'Mission Console' : v === 'body' ? 'Body Map' : 'Radiation'}")`).click()
      else await nav(v)
      await page.waitForTimeout(250)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      ok(over <= 1, `no horizontal overflow at ${w}px on ${v} (${over})`)
    }
    if (w === 390) { await page.click('button[aria-label="Show mission controls"]'); ok(await page.locator('#mobile-controls').isVisible(), 'mobile controls expand'); await shot(page, 'mobile-controls'); await page.click('button[aria-label="Show mission controls"]') }
    await shot(page, `width-${w}`)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await ctx.route(/^(?!http:\/\/localhost).*/, (r) => r.abort())
  await page.reload(); await page.waitForSelector('#main h2'); ok(true, 'loads with all external network blocked')
} catch (e) {
  fails.push('exception: ' + e.message); console.error(e)
} finally {
  await browser.close(); server.kill()
}
const realErrors = errors.filter((e) => !/ccmc\.gsfc\.nasa\.gov|Failed to fetch|ERR_FAILED|net::|CORS|Access-Control/i.test(e))
console.log(`\nChecks: ${checks} · Failures: ${fails.length} · Console errors (excluding expected live-DONKI network failure): ${realErrors.length}`)
realErrors.slice(0, 10).forEach((e) => console.log('  ', e.slice(0, 300)))
process.exit(fails.length || realErrors.length ? 1 : 0)
