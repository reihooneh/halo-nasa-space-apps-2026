// Full-page screenshot of every view for a layout audit (finds empty space and overlaps).
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const OUT = '/tmp/pages/'; mkdirSync(OUT, { recursive: true })
const W = Number(process.env.W || 1440)
const server = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: W, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:4182/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700)
await p.click('[data-welcome-close]')
const views = (process.env.VIEWS || 'console,body,log,sensors,insights,radiation,triage,readiness,sol,ground,packet,crew,clinical,lab,blackbox,sources,next,earth').split(',')
for (const v of views) {
  await p.evaluate((v) => document.querySelector(`[data-nav="${v}"]`)?.click(), v)
  await p.waitForTimeout(v === 'radiation' ? 1800 : 600)
  await p.screenshot({ path: `${OUT}${W}-${v}.png`, fullPage: true })
}
console.log('errors', JSON.stringify(errs.slice(0, 10)))
await b.close(); server.kill(); process.exit(0)
