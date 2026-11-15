// Layout audit: finds text that is cut off, text that overlaps other text, and content spilling out of its panel,
// on every page, at desktop, laptop, tablet and phone widths, plus the key story days.
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
const PORT = 4191
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => setTimeout(r, 2500))
const VIEWS = 'console,body,log,sensors,insights,radiation,triage,readiness,sol,ground,packet,crew,clinical,lab,blackbox,sources,next,earth'.split(',')
const WIDTHS = (process.env.WIDTHS || '1440,1024,768,390').split(',').map(Number)
const DAYS = (process.env.DAYS || '57,90,157').split(',').map(Number)
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let total = 0
const audit = () => {
  const out = []
  const vis = (e) => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.05) return false; for (let a = e; a; a = a.parentElement) { const t = getComputedStyle(a); if (t.display === 'none' || t.visibility === 'hidden' || Number(t.opacity) === 0) return false; if (a.classList?.contains('sr-only')) return false } return true }
  const name = (e) => (e.getAttribute('data-card') || e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const main = document.querySelector('main') || document.body
  // 1. clipped text
  for (const e of main.querySelectorAll('*')) {
    if (!vis(e) || e.closest('svg') || e.closest('[aria-hidden="true"]')) continue
    const s = getComputedStyle(e)
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own) continue
    if ((s.overflowX !== 'visible' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1) out.push(`CUT  "${name(e)}" (${e.scrollWidth}>${e.clientWidth})`)
    if (s.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 2 && s.overflowY !== 'auto' && s.overflowY !== 'scroll') out.push(`CUTV "${name(e)}"`)
  }
  // 2. overlapping text (different elements, neither containing the other)
  const boxes = []
  const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || !vis(el) || el.closest('[aria-hidden="true"]:not([data-overlap-check])')) continue
    const r = document.createRange(); r.selectNodeContents(n)
    // visible part only: clip by every scrolling or overflow-hidden ancestor
    let clip = { left: -1e9, top: -1e9, right: 1e9, bottom: 1e9 }
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (o.overflowX !== 'visible' || o.overflowY !== 'visible') { const c = a.getBoundingClientRect(); clip = { left: Math.max(clip.left, c.left), top: Math.max(clip.top, c.top), right: Math.min(clip.right, c.right), bottom: Math.min(clip.bottom, c.bottom) } } }
    if (el.closest('details') && !el.closest('details').open && !el.closest('summary')) continue
    for (const q0 of r.getClientRects()) { const q = { left: Math.max(q0.left, clip.left), top: Math.max(q0.top, clip.top), right: Math.min(q0.right, clip.right), bottom: Math.min(q0.bottom, clip.bottom) }; q.width = q.right - q.left; q.height = q.bottom - q.top; if (q.width > 2 && q.height > 2) boxes.push({ el, q, t: n.textContent.trim().slice(0, 30) }) }
  }
  const seen = new Set()
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A = boxes[i], B = boxes[j]
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue
    const ix = Math.min(A.q.right, B.q.right) - Math.max(A.q.left, B.q.left), iy = Math.min(A.q.bottom, B.q.bottom) - Math.max(A.q.top, B.q.top)
    if (ix > 3 && iy > Math.min(A.q.height, B.q.height) * 0.35) { const k = A.t + '|' + B.t; if (!seen.has(k)) { seen.add(k); out.push(`OVER "${A.t}" × "${B.t}"`) } }
  }
  // 2b. absolutely placed labels pushed outside a clipping container
  for (const e of main.querySelectorAll('[data-orbit3d] > div, [data-habitat3d] > div, [data-body3d] > button')) {
    if (!vis(e)) continue
    const c = e.parentElement.getBoundingClientRect(), r = e.getBoundingClientRect()
    if (r.width && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) out.push(`CLIP label "${name(e)}" partly outside its 3D view`)
  }
  // 3. spill outside panels / viewport
  const W = document.documentElement.clientWidth
  if (document.documentElement.scrollWidth > W + 1) out.push(`PAGE scrolls sideways (${document.documentElement.scrollWidth}>${W})`)
  for (const p of main.querySelectorAll('.panel')) {
    const pr = p.getBoundingClientRect()
    for (const e of p.querySelectorAll('*')) {
      if (!vis(e) || getComputedStyle(e).position === 'absolute' || e.closest('.overflow-x-auto, .overflow-auto, .overflow-hidden, svg')) continue
      const r = e.getBoundingClientRect()
      if (r.width && (r.right > pr.right + 2 || r.left < pr.left - 2)) { out.push(`SPILL "${name(e)}" out of panel "${name(p).slice(0, 30)}"`); break }
    }
  }
  return out
}
for (const W of WIDTHS) {
  const p = await b.newPage({ viewport: { width: W, height: 900 } })
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500)
  await p.click('[data-welcome-close]')
  const setDay = (d) => p.evaluate((d) => { const el = document.querySelector('#day'); if (!el) return; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(d)); el.dispatchEvent(new Event('input', { bubbles: true })) }, d)
  for (const d of DAYS) {
    await setDay(d)
    for (const v of VIEWS) {
      await p.evaluate((v) => document.querySelector(`[data-nav="${v}"]`)?.click(), v)
      await p.waitForTimeout(v === 'body' || v === 'radiation' ? 2600 : 350)
      if (v === 'body') { await p.hover('[data-body3d]').catch(() => {}); await p.waitForTimeout(300) } else { await p.mouse.move(2, 2); await p.waitForTimeout(150) }
      const r = await p.evaluate(audit)
      if (r.length) { total += r.length; console.log(`\n[${W}px D${d} ${v}]`); for (const x of [...new Set(r)].slice(0, 12)) console.log('  ' + x) }
    }
  }
  await p.close()
}
console.log(`\nLayout issues found: ${total}`)
await b.close(); server.kill(); process.exit(0)
