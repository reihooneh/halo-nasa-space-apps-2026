import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const OUT = '/tmp/look/'; mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errs = []
const shot = async (vp, name, fn) => {
  const p = await b.newPage({ viewport: vp }); p.on('pageerror', (e) => errs.push(name + ': ' + e)); p.on('console', (m) => m.type() === 'error' && errs.push(name + ': ' + m.text()))
  await p.goto('http://localhost:4181/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600)
  await fn(p); await p.waitForTimeout(500); await p.screenshot({ path: OUT + name + '.png' }); await p.close()
}
const close = async (p) => { await p.click('[data-welcome-close]') }
const day = async (p, d) => p.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
const D = { width: 1440, height: 900 }
await shot(D, 'a-welcome', async () => {})
await shot(D, 'b-console', close)
await shot(D, 'c-body', async (p) => { await close(p); await p.click('[data-nav="body"]') })
await shot(D, 'd-readiness', async (p) => { await close(p); await day(p, 157); await p.click('[data-nav="readiness"]') })
await shot(D, 'e-sensors', async (p) => { await close(p); await p.click('[data-nav="log"]'); await p.click('[data-cam-sim]'); await p.click('[data-ble-sim]'); await p.waitForTimeout(9000); await p.locator('[data-tour="sensors"]').scrollIntoViewIfNeeded() })
await shot(D, 'f-rad57', async (p) => { await close(p); await p.click('[data-nav="radiation"]') })
await shot(D, 'g-rad90', async (p) => { await close(p); await day(p, 90); await p.click('[data-nav="radiation"]'); await p.mouse.wheel(0, 700) })
await shot(D, 'h-ground', async (p) => { await close(p); await day(p, 157); await p.click('[data-nav="ground"]') })
await shot(D, 'i-debrief', async (p) => { await close(p); await day(p, 180) })
await shot({ width: 390, height: 844 }, 'j-mobile', close)
await shot(D, 'k-insights', async (p) => { await close(p); await p.click('[data-nav="insights"]') })
await shot(D, 'l-console-moon', async (p) => { await close(p); await p.click('[role="radio"]:has-text("Moon")') })
await b.close(); server.kill(); process.exit(0)
console.log('errors', errs)
