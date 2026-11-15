// Accessibility audit: axe-core (WCAG 2.0/2.1 A + AA) on every view, every mode, and the overlays.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from '@playwright/test'
const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const server = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4182/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500)
const results = []
const audit = async (name) => {
  await p.waitForTimeout(450)
  await p.addScriptTag({ content: AXE })
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 4).map((x) => x.target.join(' ')), summary: v.nodes[0]?.failureSummary?.slice(0, 220) }))
  })
  results.push({ name, violations: r })
  console.log(`${r.length ? '✗' : '✓'} ${name}: ${r.map((v) => `${v.id}(${v.n})`).join(', ') || 'no violations'}`)
}
const day = (d) => p.evaluate((d) => { const el = document.querySelector('#day'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
await audit('welcome dialog')
await p.click('[data-welcome-close]')
const views = ['console', 'body', 'log', 'insights', 'radiation', 'triage', 'readiness', 'ground', 'packet', 'crew', 'lab', 'blackbox', 'sources', 'earth', 'next']
for (const v of views) { await p.click(`[data-nav="${v}"]`); await audit(`view ${v}`) }
await day(90); await p.click('[data-nav="radiation"]'); await audit('radiation during storm (D90)')
await day(157); await p.click('[data-nav="triage"]'); await audit('triage urgent (D157)')
await day(180); await p.click('[data-nav="console"]'); await audit('console + debrief (D180)')
await p.click('[data-card="sleep"]'); await audit('why drawer'); await p.click('button[aria-label="Close"]')
await p.click('button[aria-label="Display and accessibility settings"]'); await audit('settings popover')
await p.click('#m-contrast'); await p.click('button[aria-label="Close settings"]')
for (const v of ['console', 'body', 'radiation']) { await p.click(`[data-nav="${v}"]`); await audit(`high contrast: ${v}`) }
await p.click('button[aria-label="Display and accessibility settings"]'); await p.click('#m-contrast'); await p.click('#m-glove'); await p.click('button[aria-label="Close settings"]')
await p.click('[data-nav="console"]'); await audit('glove mode: console')
await p.keyboard.press('j'); await p.waitForSelector('[data-judge]'); await audit('judge tour overlay')
writeFileSync(new URL('./a11y-report.json', import.meta.url), JSON.stringify(results, null, 1))
const total = results.reduce((a, r) => a + r.violations.length, 0)
console.log(`\nAudited ${results.length} states · ${total} violation types`)
const agg = {}
for (const r of results) for (const v of r.violations) { agg[v.id] ??= { impact: v.impact, help: v.help, where: [], sample: v.targets, summary: v.summary }; agg[v.id].where.push(r.name) }
for (const [k, v] of Object.entries(agg)) console.log(`\n${k} [${v.impact}] ${v.help}\n  in: ${v.where.join(' | ')}\n  e.g. ${v.sample.join(' ;; ')}\n  ${v.summary}`)
await b.close(); server.kill(); process.exit(total ? 1 : 0)
