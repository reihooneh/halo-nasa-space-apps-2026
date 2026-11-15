import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.route(/^https?:/, (r) => r.abort())
const p = await ctx.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('file://' + process.argv[2])
await p.click('[data-welcome-close]', { timeout: 15000 }); await p.waitForSelector('[data-tour="hero"]')
const font = await p.evaluate(() => document.fonts.check('16px "Inter Variable"'))
await p.click('[data-nav="radiation"]'); await p.waitForTimeout(400)
console.log('single-file offline OK; Inter bundled:', font, '; errors:', errs.length, errs.slice(0, 3))
await b.close()
