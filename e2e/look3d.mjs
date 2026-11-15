import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const OUT = '/tmp/l3/'; mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', '4183', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const W = Number(process.env.W || 1440)
const p = await b.newPage({ viewport: { width: W, height: 1000 } })
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:4183/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700)
await p.click('[data-welcome-close]')
const day = (d) => p.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
const nav = (v) => p.evaluate((v) => document.querySelector(`[data-nav="${v}"]`).click(), v)
const snap = async (sel, name) => { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500); await el.screenshot({ path: OUT + name + '.png' }) }
await nav('body'); await snap('[data-body3d]', 'body')
await p.hover('[data-body3d]'); await p.waitForTimeout(600); await p.click('[data-system3d="cardio"]'); await snap('[data-body3d]', 'body-cardio')
await nav('radiation'); await snap('[data-orbit3d]', 'orbit')
await p.click('[data-orbit-view="follow"]'); await snap('[data-orbit3d]', 'orbit-follow')
await p.click('[data-orbit-view="top"]'); await snap('[data-orbit3d]', 'orbit-top')
await day(90); await p.waitForTimeout(500); await p.click('[data-orbit-view="overview"]'); await snap('[data-orbit3d]', 'orbit-storm')
await snap('[data-habitat3d]', 'habitat')
console.log('errors', JSON.stringify(errs.slice(0, 5)))
await b.close(); server.kill(); process.exit(0)
