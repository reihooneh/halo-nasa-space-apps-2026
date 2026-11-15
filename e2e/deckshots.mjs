// Screenshots used in the pitch deck.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const OUT = '/home/claude/deck/'; mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4187', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
await p.goto('http://localhost:4187/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700)
await p.screenshot({ path: OUT + 'welcome.jpg', type: 'jpeg', quality: 85 })
await p.click('[data-welcome-close]')
const day = (d) => p.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
const nav = (v) => p.evaluate((v) => document.querySelector(`[data-nav="${v}"]`).click(), v)
const shot = async (n, ms = 900) => { await p.mouse.move(2, 2); await p.waitForTimeout(ms); await p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 }) }
await shot('console')
await nav('body'); await p.hover('[data-body3d]'); await p.click('[data-system3d="sleep"]'); await p.waitForTimeout(3000); await p.screenshot({ path: OUT + 'body.jpg', type: 'jpeg', quality: 85 })
await nav('radiation'); await day(90); await shot('radiation', 3500)
await day(157); await nav('triage'); await shot('triage')
await day(57); await nav('clinical'); await p.mouse.wheel(0, 420); await shot('clinical')
await nav('sensors'); await p.click('[data-cam-sim]'); await p.click('[data-ble-sim]'); await shot('sensors', 13000)
await b.close(); server.kill(); process.exit(0)
