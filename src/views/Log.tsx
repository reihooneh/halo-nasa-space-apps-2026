import { useEffect, useRef, useState } from 'react'
import { PVT_B, PHQ2_ITEMS, PHQ2_OPTIONS, phq2Positive } from '../data/clinical'
import { Activity, ChevronRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Eye, Footprints, Lock, Timer, Undo2 } from 'lucide-react'
import { INDICATORS, IND, type IndicatorId } from '../data/domain'
import { useHalo } from '../state/store'
import { Illustrative, Panel, Prov, StatePill, Seg, lens } from '../ui/kit'

export function LogView() {
  const h = useHalo()
  const [sel, setSel] = useState<IndicatorId>('sleep')
  const signals = useSilentSignals()
  const meta = IND[sel]
  const [custom, setCustom] = useState('')
  const key = `${h.crewId}:${h.day}:${sel}`
  const logged = h.overrides[key]
  const commit = (v: number) => { h.logValue(sel, v); signals.tap(); h.pushToast('Logged', `${meta.name}: ${v} ${meta.unit} on day ${h.day}. HALO re-ran your baseline.`, 'ok') }
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Fast logging" kicker={`Day ${h.day} · ${h.mission.crew.find((c) => c.id === h.crewId)!.name}`} tour="log">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Indicator">
            {INDICATORS.map((i) => (
              <button key={i.id} role="tab" aria-selected={sel === i.id} onClick={() => setSel(i.id)}
                className={`focus-ring tap rounded-xl border px-3 py-2 text-sm ${sel === i.id ? 'border-teal/50 bg-teal/10 text-teal' : 'border-white/10 text-ink-soft hover:text-ink'} ${lens(h.hazard, i.hazards)}`}>{i.short}</button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><div className="text-sm font-medium">{meta.name}</div><div className="text-xs text-ink-mute">Simulated value today: <span className="num">{h.mission.series[h.crewId][sel][h.idx] ?? '—'}</span> {meta.unit}{logged != null && <> · <span className="text-teal">your entry: <span className="num">{logged}</span></span></>}</div></div>
              <StatePill state={h.states[sel]} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {meta.quick.map((q) => (
                <button key={q} onClick={() => commit(q)} className="btn-ghost tap num min-w-[64px] text-base">{q}</button>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(custom); if (!Number.isFinite(v) || custom === '') { signals.error(); return } commit(v); setCustom('') }}>
              <label htmlFor="custom" className="sr-only">Custom value</label>
              <input id="custom" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`Other value (${meta.unit})`} className="focus-ring w-48 rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm" />
              <button className="btn-primary" type="submit"><Check size={15} aria-hidden /> Log</button>
              {logged != null && <button type="button" className="btn-ghost" onClick={() => { const o = { ...h.overrides }; delete o[key]; h.set('overrides', o); signals.undo() }}><Undo2 size={15} aria-hidden /> Undo</button>}
            </form>
          </div>
        </Panel>

        <Panel title={`How to measure: ${meta.short}`} kicker="3 steps · no experience needed" right={<Prov ids={meta.sources} />}>
          <ol className="space-y-3">
            {meta.howTo.map((s, k) => (
              <li key={k} className="flex gap-3"><span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/15 text-sm font-semibold text-teal">{k + 1}</span><span className="pt-1 text-sm text-ink-soft">{s}</span></li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-xs text-ink-soft"><b className="text-ink">Why it matters:</b> {meta.why}</div>
          <div className="mt-2 rounded-xl border border-teal/20 bg-teal/[0.05] p-3 text-xs text-ink-soft"><b className="text-teal">{meta.guideline.kind === 'guideline' ? 'Clinical reference: ' : 'Reference note: '}</b>{meta.guideline.text}<div className="mt-1.5"><Prov ids={meta.guideline.sources} /></div></div>
        </Panel>
      </div>

      <button onClick={() => h.go('sensors')} className="focus-ring tap panel flex w-full items-center gap-3 p-4 text-left hover:border-white/15" data-goto-sensors>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal"><Activity size={18} aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Sensors &amp; validation</span><span className="block text-xs text-ink-mute">Camera pulse, Bluetooth strap and Bland–Altman agreement now have their own page.</span></span>
        <ChevronRight size={16} className="text-ink-mute" aria-hidden />
      </button>

      <div className="grid gap-5 xl:grid-cols-3">
        <PvtTest />
        <VisionTest />
        <BalanceTest />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Journal />
        <Panel title="Silent signals" kicker="Passive, on-device only" right={<span className="chip border-white/10 text-ink-mute"><Lock size={11} /> Local</span>}>
          <p className="text-xs text-ink-soft">HALO notices how you use it, not what you type: tap tempo, corrections and time of day can hint at fatigue. Nothing leaves this device.</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/[0.06] p-2"><dt className="label">Tap tempo</dt><dd className="num mt-1 text-lg">{signals.tempo ? `${signals.tempo} ms` : '—'}</dd></div>
            <div className="rounded-xl border border-white/[0.06] p-2"><dt className="label">Corrections</dt><dd className="num mt-1 text-lg">{signals.corrections}</dd></div>
            <div className="rounded-xl border border-white/[0.06] p-2"><dt className="label">Hour</dt><dd className="num mt-1 text-lg">{new Date().getHours().toString().padStart(2, '0')}:00</dd></div>
          </dl>
          <ul className="mt-3 space-y-1.5 text-xs text-ink-soft">
            <li className="flex gap-2"><span className="text-teal">•</span>Slower tap tempo than your usual can mean fatigue.</li>
            <li className="flex gap-2"><span className="text-teal">•</span>More corrections than usual can mean reduced attention.</li>
            <li className="flex gap-2"><span className="text-teal">•</span>Logging far outside your normal hours can mean a shifted body clock.</li>
          </ul>
          <div className="mt-3 text-[11px] text-ink-mute">Shown for transparency. These features are logged only and do not raise flags until validated against crew data.</div>
        </Panel>
      </div>
    </div>
  )
}

function useSilentSignals() {
  const last = useRef<number | null>(null)
  const gaps = useRef<number[]>([])
  const [tempo, setTempo] = useState<number | null>(null)
  const [corrections, setCorrections] = useState(0)
  return {
    tempo, corrections,
    tap: () => { const n = performance.now(); if (last.current) { gaps.current = [...gaps.current, n - last.current].slice(-10); const s = [...gaps.current].sort((a, b) => a - b); setTempo(Math.round(s[Math.floor(s.length / 2)])) } last.current = n },
    undo: () => setCorrections((c) => c + 1),
    error: () => setCorrections((c) => c + 1),
  }
}

function Journal() {
  const h = useHalo()
  const [t, setT] = useState('')
  const mine = h.journal.filter((j) => j.day <= h.day).slice(-4).reverse()
  return (
    <Panel title="Private journal" kicker="Mood check-in" right={<Prov ids={['hazIsolation']} />}>
      <p className="text-xs text-ink-soft">NASA behavioural scientists use journaling to understand mental and emotional states in isolation. Entries stay private: only your mood score (1–5) is used by HALO.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!t.trim()) return; h.set('journal', [...h.journal, { day: h.day, text: t.trim() }]); setT('') }}>
        <label htmlFor="jr" className="sr-only">Journal entry</label>
        <input id="jr" value={t} onChange={(e) => setT(e.target.value)} placeholder="One line about today…" className="focus-ring flex-1 rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm" />
        <button className="btn-ghost" type="submit">Save</button>
      </form>
      <ul className="mt-3 space-y-1.5">{mine.map((j, k) => <li key={k} className="text-sm text-ink-soft"><span className="num mr-2 text-xs text-ink-mute">D{j.day}</span>{j.text}</li>)}{mine.length === 0 && <li className="text-xs text-ink-mute">No entries yet.</li>}</ul>
      <Phq2 />
    </Panel>
  )
}

/** PHQ-2: validated two-item depression screen (Kroenke et al. 2003). Positive at ≥3; a screen, never a diagnosis. */
function Phq2() {
  const h = useHalo()
  const [a, setA] = useState<(number | null)[]>([null, null])
  const score = a[0] != null && a[1] != null ? (a[0] as number) + (a[1] as number) : null
  return (
    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3" data-phq2>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium">Validated screen: PHQ-2</div><Prov ids={['phq2']} /></div>
      <p className="mt-1 text-[11px] text-ink-mute">Over the last 2 weeks, how often have you been bothered by…</p>
      {PHQ2_ITEMS.map((q, i) => (
        <fieldset key={q} className="mt-2">
          <legend className="text-xs text-ink-soft">{i + 1}. {q}</legend>
          <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {PHQ2_OPTIONS.map((o, v) => (
              <button key={o} type="button" aria-pressed={a[i] === v} onClick={() => setA((x) => x.map((y, k) => (k === i ? v : y)))}
                className={`focus-ring tap rounded-lg border px-2 py-1.5 text-[11px] ${a[i] === v ? 'border-teal bg-teal/15 text-ink' : 'border-white/10 text-ink-soft hover:bg-white/[0.04]'}`}>{o} <span className="num text-ink-mute">({v})</span></button>
            ))}
          </div>
        </fieldset>
      ))}
      {score != null && (
        <div className={`mt-3 rounded-xl border p-2.5 text-xs ${phq2Positive(score) ? 'border-warn/40 bg-warn/[0.07]' : 'border-ok/25 bg-ok/[0.05]'}`} role="status">
          <b className="num">Score {score}/6.</b> {phq2Positive(score) ? 'Positive screen (≥3). This is not a diagnosis: HALO suggests a private conversation with the behavioural-health team.' : 'Negative screen (<3). Keep checking in.'}
          {phq2Positive(score) && <button className="btn-ghost ml-2 px-2 py-1 text-[11px]" onClick={() => { h.sendGround(`Private: crew member requests behavioural-health conversation (PHQ-2 positive, D${h.day})`, 'note'); h.pushToast('Private request queued', 'Only the behavioural-health team sees it.', 'ok') }}>Request private session</button>}
        </div>
      )}
    </div>
  )
}

/* F12: Brief Psychomotor Vigilance Test (PVT-B protocol: ISI 2–5 s, lapse ≥355 ms, false start <100 ms) */
function PvtTest() {
  const h = useHalo()
  const [dur, setDur] = useState<'30' | '120' | '180'>('30')
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'done'>('idle')
  const [rts, setRts] = useState<number[]>([])
  const [falseStarts, setFalse] = useState(0)
  const [ms, setMs] = useState(0)
  const startAt = useRef(0), endAt = useRef(0), timer = useRef<number | null>(null), raf = useRef<number | null>(null)
  const clear = () => { if (timer.current) window.clearTimeout(timer.current); if (raf.current) cancelAnimationFrame(raf.current) }
  useEffect(() => clear, [])
  const schedule = () => {
    if (performance.now() >= endAt.current) { setPhase('done'); return }
    setPhase('wait')
    timer.current = window.setTimeout(() => {
      startAt.current = performance.now(); setPhase('go')
      const tick = () => { setMs(Math.round(performance.now() - startAt.current)); raf.current = requestAnimationFrame(tick) }
      raf.current = requestAnimationFrame(tick)
    }, PVT_B.isiMinMs + Math.random() * (PVT_B.isiMaxMs - PVT_B.isiMinMs))
  }
  const start = () => { setRts([]); setFalse(0); endAt.current = performance.now() + Number(dur) * 1000; schedule() }
  const press = () => {
    if (phase === 'wait') { setFalse((f) => f + 1); return }
    if (phase !== 'go') return
    clear()
    const rt = Math.round(performance.now() - startAt.current)
    if (rt < PVT_B.falseStartMs) { setFalse((f) => f + 1); schedule(); return }
    setRts((r) => [...r, rt]); setMs(rt); schedule()
  }
  const mean = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0
  const lapses = rts.filter((r) => r >= PVT_B.lapseMs).length
  const speed = rts.length ? (rts.reduce((a, b) => a + 1000 / b, 0) / rts.length).toFixed(2) : '—'
  const official = dur === '180'
  return (
    <Panel title="Reaction test (PVT-B)" kicker="Alertness · NASA Reaction Self-Test protocol" right={<Prov ids={['spinoffRst', 'pvtB']} />}>
      <p className="text-xs text-ink-soft">NASA flies a 3-minute Psychomotor Vigilance Test on the ISS as the Reaction Self-Test. HALO uses the same scoring: stimulus every 2–5 s, a <b>lapse</b> is a response of 355 ms or more, and a response under 100 ms is a false start. Tap as soon as the counter appears.</p>
      <div className="mt-2"><Seg label="Test length" size="sm" value={dur} onChange={setDur} options={[{ v: '30', label: '30 s demo' }, { v: '120', label: '2 min' }, { v: '180', label: '3 min' }]} /></div>
      <button onClick={phase === 'idle' || phase === 'done' ? start : press} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); phase === 'idle' || phase === 'done' ? start() : press() } }}
        className={`focus-ring mt-3 flex h-36 w-full select-none flex-col items-center justify-center rounded-2xl border text-center transition-colors ${phase === 'go' ? 'border-teal bg-teal/15' : phase === 'wait' ? 'border-white/10 bg-space-900' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`} aria-live="polite" data-pvt>
        {phase === 'idle' && <><Timer className="text-teal" aria-hidden /><span className="mt-2 text-sm">Start test</span></>}
        {phase === 'wait' && <span className="text-sm text-ink-mute">Wait for it… (tap only when numbers appear)</span>}
        {phase === 'go' && <span className="num text-4xl font-semibold text-teal">{ms}</span>}
        {phase === 'done' && <><span className="num text-3xl font-semibold">{mean || '—'} ms</span><span className="mt-1 text-xs text-ink-mute">mean · {rts.length} responses · {lapses} lapses (≥{PVT_B.lapseMs} ms) · {falseStarts} false starts · speed {speed}/s</span>{!official && <span className="mt-0.5 text-[10px] text-ink-mute">Practice length: only the 3-min run matches PVT-B</span>}</>}
      </button>
      {phase === 'done' && rts.length > 0 && (
        <button className="btn-primary mt-3 w-full" onClick={() => { h.logValue('pvt', mean); h.addTest({ day: h.day, kind: 'pvt', value: mean, detail: `${mean} ms mean, ${lapses} lapses ≥${PVT_B.lapseMs} ms, ${falseStarts} false starts${official ? ' (PVT-B 3 min)' : ' (practice)'}` }); h.pushToast('Reaction time logged', `${mean} ms feeds your baseline engine.`, 'ok') }}>Save to baseline</button>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2"><Illustrative text="Screening aid only" /><Prov ids={['pvtLapse', 'pvtRst']} /></div>
    </Panel>
  )
}

/* F13: tumbling-E near-vision check */
const SIZES = [64, 48, 36, 28, 22, 17, 13, 10]
type Dir = 'up' | 'down' | 'left' | 'right'
const ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 }
function VisionTest() {
  const h = useHalo()
  const [lvl, setLvl] = useState(-1)
  const [dir, setDir] = useState<Dir>('right')
  const [trial, setTrial] = useState(0)
  const [hits, setHits] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const prev = h.tests.filter((t) => t.kind === 'vision' && t.day < h.day)
  const base = prev.length ? Number(prev[0].detail.match(/line (\d+)/)?.[1] ?? 0) : null
  const next = () => setDir((['up', 'down', 'left', 'right'] as Dir[])[Math.floor(Math.random() * 4)])
  const begin = () => { setLvl(0); setTrial(0); setHits(0); setBest(null); next() }
  const answer = (d: Dir) => {
    const ok = d === dir
    const nh = hits + (ok ? 1 : 0), nt = trial + 1
    if (nt < 3) { setHits(nh); setTrial(nt); next(); return }
    if (nh >= 2) {
      if (lvl + 1 >= SIZES.length) { finish(lvl + 1) } else { setLvl(lvl + 1); setTrial(0); setHits(0); next() }
    } else finish(lvl)
  }
  const finish = (line: number) => {
    setBest(line); setLvl(-2)
    const delta = base == null ? 0 : line - base
    h.addTest({ day: h.day, kind: 'vision', value: delta, detail: `line ${line} of ${SIZES.length}${base != null ? ` (baseline line ${base})` : ' (baseline set)'}` })
  }
  useEffect(() => {
    if (lvl < 0) return
    const k = (e: KeyboardEvent) => { const m: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }; if (m[e.key]) { e.preventDefault(); e.stopPropagation(); answer(m[e.key]) } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  })
  return (
    <Panel title="Near-vision check" kicker="Weekly · SANS screening aid" right={<Prov ids={['hrpRisks']} />}>
      <p className="text-xs text-ink-soft">Hold the screen at a fixed arm’s length, same distance every week. Point to the way the E opens (arrow keys or buttons).</p>
      <div className="mt-3 flex h-36 items-center justify-center rounded-2xl border border-white/10 bg-white text-black" aria-live="polite">
        {lvl >= 0 ? <span aria-label={`Letter E, size level ${lvl + 1}`} style={{ fontSize: SIZES[lvl], transform: `rotate(${ROT[dir]}deg)`, fontFamily: 'Inter Variable, sans-serif', fontWeight: 700, lineHeight: 1 }}>E</span>
          : best != null ? <div className="text-center"><div className="text-2xl font-semibold">Line {best} / {SIZES.length}</div><div className="text-xs">{base == null ? 'Saved as your baseline' : best < base ? `Below your baseline (line ${base}). Report to flight surgeon.` : `At or above your baseline (line ${base}).`}</div></div>
            : <button className="btn-primary" onClick={begin}><Eye size={15} aria-hidden /> Start check</button>}
      </div>
      {lvl >= 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {([['up', ArrowUp], ['down', ArrowDown], ['left', ArrowLeft], ['right', ArrowRight]] as const).map(([d, I]) => <button key={d} className="btn-ghost tap" onClick={() => answer(d)} aria-label={`Opens ${d}`}><I size={18} /></button>)}
        </div>
      )}
      {best != null && <button className="btn-ghost mt-3 w-full" onClick={begin}>Repeat</button>}
      <div className="mt-2"><Illustrative text="Trend aid, not a clinical acuity test" /></div>
    </Panel>
  )
}

/* F14: Balance check with motion sensors, graceful fallback to guided self-rating */
function BalanceTest() {
  const h = useHalo()
  const [mode, setMode] = useState<'idle' | 'probe' | 'sensor' | 'fallback' | 'done'>('idle')
  const [left, setLeft] = useState(20)
  const [score, setScore] = useState<string>('')
  const samples = useRef<number[]>([])
  const start = async () => {
    setMode('probe'); samples.current = []
    const DM: any = (window as any).DeviceMotionEvent
    try { if (DM && typeof DM.requestPermission === 'function') { const r = await DM.requestPermission(); if (r !== 'granted') { setMode('fallback'); return } } } catch { setMode('fallback'); return }
    let got = false
    const on = (e: DeviceMotionEvent) => { const a = e.acceleration; if (a && a.x != null) { got = true; samples.current.push(Math.hypot(a.x || 0, a.y || 0, a.z || 0)) } }
    window.addEventListener('devicemotion', on)
    window.setTimeout(() => {
      if (!got) { window.removeEventListener('devicemotion', on); setMode('fallback'); return }
      setMode('sensor'); let t = 20; setLeft(t)
      const iv = window.setInterval(() => { t -= 1; setLeft(t); if (t <= 0) { window.clearInterval(iv); window.removeEventListener('devicemotion', on); const s = samples.current; const rms = Math.sqrt(s.reduce((a, b) => a + b * b, 0) / Math.max(1, s.length)); save(rms < 0.6 ? 0 : -1, `sway RMS ${rms.toFixed(2)} m/s²`) } }, 1000)
    }, 1200)
  }
  const save = (value: number, detail: string) => { h.addTest({ day: h.day, kind: 'balance', value, detail }); setScore(detail); setMode('done') }
  return (
    <Panel title="Balance check" kicker="Before EVA, landing or gravity change" right={<Prov ids={['hazGravity']} />}>
      <p className="text-xs text-ink-soft">Gravity transitions affect balance, coordination and walking. On a phone, HALO measures sway with motion sensors; elsewhere it guides a self-rating.</p>
      {mode === 'idle' && <button className="btn-primary mt-3 w-full" onClick={start}><Footprints size={15} aria-hidden /> Start balance check</button>}
      {mode === 'probe' && <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-sm text-ink-soft">Looking for motion sensors…</div>}
      {mode === 'sensor' && <div className="mt-3 rounded-xl border border-teal/40 bg-teal/10 p-4 text-center"><div className="text-sm">Stand on one foot, device held at your chest.</div><div className="num mt-1 text-3xl text-teal">{left}s</div></div>}
      {mode === 'fallback' && (
        <div className="mt-3 rounded-xl border border-white/10 p-3">
          <div className="text-xs text-ink-mute">No motion sensor on this device. Guided self-rating:</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft"><li>Hold a handrail; stand on one foot.</li><li>Release for 20 seconds (or float still with eyes closed in 0 g).</li><li>Rate how steady you felt.</li></ol>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((r) => <button key={r} className="btn-ghost tap num" onClick={() => save(r >= 4 ? 0 : -1, `self-rating ${r}/5`)} aria-label={`Steadiness ${r} of 5`}>{r}</button>)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-mute"><span>very unsteady</span><span>rock solid</span></div>
        </div>
      )}
      {mode === 'done' && <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-sm">Saved: <span className="num">{score}</span>. <button className="text-teal underline" onClick={() => setMode('idle')}>Repeat</button></div>}
      <div className="mt-3 rounded-xl border border-white/[0.06] p-3">
        <div className="label mb-1.5">Recent checks</div>
        <ul className="space-y-1 text-xs text-ink-soft">{h.allTests.filter((t) => t.kind === 'balance' && t.day <= h.day).slice(-4).reverse().map((t, k) => <li key={k} className="flex items-center gap-2"><span className="num w-10 text-ink-mute">D{t.day}</span><span className={`h-1.5 w-1.5 rounded-full ${t.value < 0 ? 'bg-warn' : 'bg-ok'}`} aria-hidden /><span className="truncate">{t.detail}</span></li>)}</ul>
        <p className="mt-2 text-[11px] text-ink-mute">A drop from your own usual result feeds the EVA Go/No-Go poll and Landing Readiness.</p>
      </div>
      <div className="mt-2"><Illustrative text="Go/no-go aid, not clinical" /></div>
    </Panel>
  )
}
