import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const OUT = '/home/claude/deck/'; mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4187', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await p.goto('http://localhost:4187/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700)
await p.click('[data-welcome-close]')
const day = (d) => p.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
const nav = (v) => p.evaluate((v) => document.querySelector(`[data-nav="${v}"]`).click(), v)
const shot = async (n, ms = 900) => { await p.waitForTimeout(ms); await p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 82 }) }
await day(157); await nav('triage'); await shot('triage')
await b.close(); server.kill(); process.exit(0)
