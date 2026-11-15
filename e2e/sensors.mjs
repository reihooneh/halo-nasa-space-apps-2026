// Sensor test bench. Real code paths, not the built-in simulators:
//  Camera: Chrome's fake camera plays a video whose skin colour pulses at a known rate; HALO must read that rate.
//  Bluetooth: a mock Web Bluetooth device sends spec-format GATT Heart Rate packets (0x2A37) in ten scenarios.
import { spawn, execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { chromium } from '@playwright/test'
const PORT = 4190, APP = `http://localhost:${PORT}/`
const exe = process.env.CHROME || '/usr/bin/google-chrome'
const ONLY = process.env.ONLY || 'camera,ble'
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${m}`) }
const open = async (browser, init, arg) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['camera'] })
  const page = await ctx.newPage()
  const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  if (init) await page.addInitScript(init, arg)
  await page.goto(APP); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400)
  await page.click('[data-welcome-close]'); await page.click('[data-nav="sensors"]'); await page.waitForTimeout(300)
  return { page, errs, ctx }
}

if (ONLY.includes('camera')) {
  console.log('Camera pulse: fake camera fed a pulsing-skin video (20 s each)')
  const rates = (process.env.BPMS || '48,54,60,66,72,78,84,96,108,120').split(',').map(Number)
  for (const bpm of rates) {
    const file = `/tmp/pulse-${bpm}.y4m`
    execFileSync('python3', ['e2e/make_pulse_video.py', String(bpm), file])
    const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${file}`] })
    const { page, errs } = await open(browser)
    await page.click('[data-cam]')
    await page.waitForSelector('[data-cam-state="done"], [data-cam-state="error"]', { timeout: 40000 })
    const got = Number(await page.locator('[data-cam-bpm]').innerText()), q = await page.locator('[data-cam-quality]').innerText()
    const meta = await page.locator('[data-cam-quality] + span').innerText().catch(() => '')
    ok(Math.abs(got - bpm) <= 2 && q !== 'low' && errs.length === 0, `video at ${bpm} bpm → HALO reads ${got} bpm (signal ${q}, ${meta})${errs.length ? ' errors: ' + errs[0] : ''}`)
    if (bpm === rates[0]) {
      await page.click('button:has-text("Log as resting HR")'); ok(await page.locator('text=Heart rate logged').count() > 0, 'camera reading can be logged as resting HR')
      await page.click('[data-cam]'); await page.waitForTimeout(1500); await page.click('button:has-text("Stop")')
      ok(await page.evaluate(() => { const v = document.querySelector('video'); return !v.srcObject }), 'Stop releases the camera (no stream left open)')
    }
    await browser.close(); rmSync(file, { force: true })
  }
  // Failure paths
  const b2 = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  for (const [name, msg] of [['NotAllowedError', 'permission was declined'], ['NotFoundError', 'No camera was found'], ['NotReadableError', 'in use by another app']]) {
    const { page } = await open(b2, (n) => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error(n), { name: n })) }, name)
    await page.click('[data-cam]'); await page.waitForSelector('[data-cam-error]')
    ok((await page.locator('[data-cam-error]').innerText()).includes(msg), `camera ${name} → clear message + retry button`)
    await page.click('[data-cam-sim]'); await page.waitForSelector('[data-cam-state="done"]', { timeout: 30000 })
    if (name === 'NotAllowedError') ok(Math.abs(Number(await page.locator('[data-cam-bpm]').innerText()) - 64) <= 2, 'simulated fallback still measures 64 bpm after an error')
    await page.context().close()
  }
  await b2.close()
}

if (ONLY.includes('ble')) {
  console.log('Bluetooth strap: mock GATT Heart Rate device, spec-format packets')
  const mock = (sc) => {
    const pkt = (k) => {
      const hr = sc.hr + (sc.vary ? (k % 3) - 1 : 0)
      let flags = 0; const b = []
      if (sc.wide) flags |= 1
      if (sc.contact === 'ok') flags |= 0x06
      if (sc.contact === 'lost') flags |= 0x04
      if (sc.energy) flags |= 0x08
      if (sc.rr) flags |= 0x10
      b.push(flags); if (sc.wide) b.push(hr & 255, hr >> 8); else b.push(hr)
      if (sc.energy) b.push(40, 0)
      if (sc.rr) for (const ms of (sc.rr === 'dropout' && k % 5 === 4 ? [2040] : [k % 2 ? 1010 : 1000])) { const u = Math.round((ms / 1000) * 1024); b.push(u & 255, u >> 8) }
      return new DataView(new Uint8Array(b).buffer)
    }
    let asked = 0, connects = 0
    const make = () => {
      const dev = new EventTarget(); dev.name = sc.name
      const ch = new EventTarget(); let iv = null, k = 0
      ch.startNotifications = async () => {
        iv = setInterval(() => {
          if (!dev.gatt.connected) return
          ch.value = pkt(k++); ch.dispatchEvent(new Event('characteristicvaluechanged'))
          if (sc.dropAt && k === sc.dropAt) { dev.gatt.connected = false; clearInterval(iv); dev.dispatchEvent(new Event('gattserverdisconnected')) }
        }, 150)
        return ch
      }
      dev.gatt = {
        connected: false,
        connect: async () => { connects++; if (sc.failConnects && connects <= sc.failConnects) throw Object.assign(new Error('GATT Server is disconnected'), { name: 'NetworkError' }); if (sc.neverBack && connects > 1) throw Object.assign(new Error('out of range'), { name: 'NetworkError' }); dev.gatt.connected = true; return dev.gatt },
        disconnect: () => { dev.gatt.connected = false; clearInterval(iv); dev.dispatchEvent(new Event('gattserverdisconnected')) },
        getPrimaryService: async (s) => {
          if (s === 'heart_rate') return { getCharacteristic: async () => ch }
          if (s === 'battery_service' && sc.battery != null) return { getCharacteristic: async () => ({ readValue: async () => new DataView(new Uint8Array([sc.battery]).buffer) }) }
          throw Object.assign(new Error('no service'), { name: 'NotFoundError' })
        },
      }
      return dev
    }
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: { requestDevice: async (o) => { window.__bleOpts = o; asked++; if (sc.cancelFirst && asked === 1) throw Object.assign(new Error('User cancelled'), { name: 'NotFoundError' }); return make() } } })
  }
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  const txt = (page, sel) => page.locator(sel).first().innerText()
  const run = async (label, sc, check, wait = 2600) => {
    const { page, errs } = await open(browser, mock, { name: 'Test Strap H10', hr: 62, ...sc })
    await page.click('[data-ble]'); await page.waitForTimeout(wait)
    let good = false, detail = ''
    try { [good, detail] = await check(page) } catch (e) { detail = String(e).slice(0, 120) }
    ok(good && errs.length === 0, `${label} → ${detail}${errs.length ? ' errors: ' + errs[0] : ''}`)
    return page
  }
  const live = async (p) => (await p.locator('[data-ble-state="live"]').count()) > 0
  await run('1. 8-bit heart rate, no RR', { hr: 62 }, async (p) => { const m = await txt(p, '[data-ble-median]'), v = await txt(p, '[data-ble-hrv]'); return [m === '62' && v === '—' && await live(p), `median ${m}, HRV ${v}`] })
  await run('2. 8-bit + RR intervals', { hr: 60, rr: true }, async (p) => { const m = await txt(p, '[data-ble-median]'), v = await txt(p, '[data-ble-hrv]'); return [m === '60' && Math.abs(Number(v) - 10) <= 1, `median ${m}, RMSSD ${v} ms (expected 10)`] })
  await run('3. 16-bit heart rate + RR', { hr: 171, wide: true, rr: true }, async (p) => { const m = await txt(p, '[data-ble-median]'); return [m === '171', `median ${m}`] })
  await run('4. energy-expended field before RR', { hr: 75, energy: true, rr: true, wide: true }, async (p) => { const m = await txt(p, '[data-ble-median]'), v = await txt(p, '[data-ble-hrv]'); return [m === '75' && Math.abs(Number(v) - 10) <= 1, `median ${m}, RMSSD ${v} (energy bytes skipped)`] })
  await run('5. sensor-contact flag: good contact', { contact: 'ok', vary: true }, async (p) => { const c = await p.locator('[data-ble-contact="ok"]').count(), m = await txt(p, '[data-ble-median]'); return [c === 1 && m === '62', `contact chip shown, median ${m} from varying 61–63`] })
  await run('6. sensor-contact flag: no skin contact', { contact: 'lost' }, async (p) => { const w = await p.locator('[data-ble-stale]').count(), m = await txt(p, '[data-ble-median]'); return [w === 1 && m === '—', `warning shown, readings ignored (median ${m})`] })
  await run('7. battery service', { battery: 83 }, async (p) => { const b = await txt(p, '[data-ble-battery]'); return [b.includes('83%') && await p.evaluate(() => window.__bleOpts.optionalServices.includes('battery_service') && window.__bleOpts.filters[0].services[0] === 'heart_rate'), `battery ${b}; requests heart_rate + optional battery_service`] })
  await run('8. link drops mid-stream, strap returns', { dropAt: 8, rr: true }, async (p) => { const m = await txt(p, '[data-ble-median]'); return [await live(p) && m === '62', `auto-reconnected, still streaming (median ${m})`] }, 5200)
  await run('9. link drops and never returns', { dropAt: 5, neverBack: true }, async (p) => { const e = await txt(p, '[data-ble-error]'); return [e.includes('did not come back') && await p.locator('[data-ble]').count() === 1, 'three retries, then a clear message and a Try again button'] }, 8500)
  await run('10. user cancels the chooser, then retries', { cancelFirst: true, rr: 'dropout', name: undefined }, async (p) => {
    const e = await txt(p, '[data-ble-error]'); await p.click('[data-ble]'); await p.waitForTimeout(3600)
    const u = await p.locator('[data-ble-hrv]').locator('xpath=following-sibling::div').innerText(), m = await txt(p, '[data-ble-median]')
    await p.click('[data-ble-log]'); const logged = await p.locator('text=Heart rate logged').count()
    await p.click('button:has-text("Disconnect")'); const idle = await p.locator('[data-ble-state="idle"]').count()
    return [e.includes('No strap selected') && m === '62' && /filtered/.test(u) && logged > 0 && idle === 1, `“No strap selected”, retry works, unnamed device handled, dropout beats filtered (${u.trim()}), logged, clean disconnect`]
  }, 600)
  await run('11. first connection attempt fails (strap asleep)', { failConnects: 1 }, async (p) => { const e = await txt(p, '[data-ble-error]'); await p.click('[data-ble]'); await p.waitForTimeout(2200); return [e.includes('Could not connect') && await live(p), 'error explained; second attempt connects'] }, 500)
  await browser.close()
}
console.log(`\nSensor bench: ${pass} passed · ${fail} failed`)
server.kill(); process.exit(fail ? 1 : 0)
