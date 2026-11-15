import { bpCategory } from '../data/clinical'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, CircleAlert, Download, PlaneLanding, Rocket, XCircle } from 'lucide-react'
import { IND, SYS, type SystemId } from '../data/domain'
import { useHalo } from '../state/store'
import { cumulativeDose, idxOf, fmtDate } from '../sim/mission'
import type { DriftState } from '../engine/drift'
import { Illustrative, Panel, Prov, ReadAloud, Seg, Simulated, download } from '../ui/kit'

export type Go = 'go' | 'caution' | 'nogo'
const GO_META: Record<Go, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  go: { label: 'GO', color: '#34D399', Icon: CheckCircle2 },
  caution: { label: 'GO with conditions', color: '#F59E0B', Icon: CircleAlert },
  nogo: { label: 'NO-GO', color: '#F43F5E', Icon: XCircle },
}
const fromState = (s: DriftState): Go => (s === 'drift' ? 'nogo' : s === 'watch' ? 'caution' : 'go')
const worst = (xs: Go[]): Go => (xs.includes('nogo') ? 'nogo' : xs.includes('caution') ? 'caution' : 'go')

export interface PollRow { id: SystemId | 'radiation'; name: string; go: Go; why: string }

/** EVA Go/No-Go poll per body system, built only from HALO's existing drift states and checks (rules illustrative). */
export function useEvaPoll(): PollRow[] {
  const h = useHalo()
  const s = h.states
  const lastTest = (k: 'vision' | 'balance') => h.allTests.filter((t) => t.kind === k && t.day <= h.day).at(-1)
  const vis = lastTest('vision'), bal = lastTest('balance')
  return [
    { id: 'cardio', name: SYS.cardio.name, go: worst([fromState(s.hr), fromState(s.sbp), fromState(s.dbp)]), why: `HR ${h.latest.hr ?? '—'} bpm, BP ${h.latest.sbp ?? '—'}/${h.latest.dbp ?? '—'} vs your baseline` },
    { id: 'brain', name: SYS.brain.name, go: worst([fromState(s.pvt), s.mood === 'drift' ? 'caution' : fromState(s.mood)]), why: `Reaction ${h.latest.pvt ?? '—'} ms, mood ${h.latest.mood ?? '—'}/5` },
    { id: 'sleep', name: SYS.sleep.name, go: s.sleep === 'drift' ? 'caution' : fromState(s.sleep), why: `Slept ${h.latest.sleep ?? '—'} h. Sleep debt alone is a condition, not a no-go.` },
    { id: 'immune', name: SYS.immune.name, go: h.latest.temp != null && h.latest.temp >= 38 ? 'nogo' : fromState(s.temp), why: `Temperature ${h.latest.temp ?? '—'} °C` },
    { id: 'msk', name: SYS.msk.name, go: s.exercise === 'drift' ? 'caution' : 'go', why: `Exercise ${h.latest.exercise ?? '—'} min today` },
    { id: 'eyes', name: SYS.eyes.name, go: vis ? (vis.value < 0 ? 'caution' : 'go') : 'caution', why: vis ? `Last check D${vis.day}: ${vis.detail}` : 'No vision check yet' },
    { id: 'sensorimotor', name: SYS.sensorimotor.name, go: bal ? (bal.value < 0 ? 'nogo' : 'go') : 'caution', why: bal ? `Last check D${bal.day}: ${bal.detail}` : 'No balance check yet' },
    { id: 'radiation', name: 'Space weather', go: h.speActive ? 'nogo' : h.watchActive ? 'nogo' : 'go', why: h.speActive ? 'Solar particle event in progress' : h.watchActive ? 'Space-weather watch: no EVA until cleared' : 'No active watch (NASA CCMC DONKI cache)' },
  ]
}

export function ReadinessView() {
  const h = useHalo()
  const [mode, setMode] = useState<'eva' | 'landing'>('eva')
  const poll = useEvaPoll()
  const eva = worst(poll.map((p) => p.go))
  const landing = useLanding()
  const m = GO_META[eva]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Seg label="Readiness mode" value={mode} onChange={setMode} options={[{ v: 'eva', label: <span className="inline-flex items-center gap-1.5"><Rocket size={14} aria-hidden />EVA Go/No-Go</span> }, { v: 'landing', label: <span className="inline-flex items-center gap-1.5"><PlaneLanding size={14} aria-hidden />Landing readiness</span> }]} />
        <Simulated /><Illustrative text="Go/no-go rules illustrative" />
      </div>
      {mode === 'eva' ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
          <Panel title="EVA decision" kicker={`Day ${h.day} · ${h.mission.crew.find((c) => c.id === h.crewId)!.name}`} tour="eva">
            <motion.div key={eva} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center rounded-3xl border p-6 text-center" style={{ borderColor: m.color + '66', background: `radial-gradient(circle at 50% 0%, ${m.color}22, transparent 70%)` }}>
              <m.Icon size={44} style={{ color: m.color }} aria-hidden />
              <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: m.color }}>{m.label}</div>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">{eva === 'nogo' ? 'At least one system is NO-GO. Postpone the EVA and work the matching protocol.' : eva === 'caution' ? 'Proceed only with the conditions listed, a buddy check and a shortened timeline.' : 'All systems within personal range. Proceed per procedure.'}</p>
            </motion.div>
            <div className="mt-4 flex flex-wrap gap-2"><ReadAloud label="Read the poll" lines={[`EVA poll for day ${h.day}. Decision: ${m.label}.`, ...poll.map((p) => `${p.name}: ${GO_META[p.go].label}.`)]} /></div>
            <p className="mt-3 text-[11px] text-ink-mute">Each system reports GO / GO with conditions / NO-GO from HALO’s drift states, the latest vision and balance checks, and space weather. A flight surgeon and the commander make the final call.</p>
            <PreEva />
          </Panel>
          <Panel title="Poll by system" kicker="Like a mission-control go/no-go poll">
            <ol className="space-y-2" aria-label="EVA go/no-go poll">
              {poll.map((p, k) => {
                const g = GO_META[p.go]
                return (
                  <motion.li key={p.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <span className="num w-6 text-xs text-ink-mute">{String(k + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium">{p.name}</div><div className="break-words text-xs text-ink-mute">{p.why}</div></div>
                    <span className="chip shrink-0" style={{ borderColor: g.color + '66', color: g.color, background: g.color + '14' }}><g.Icon size={13} aria-hidden />{g.label}</span>
                  </motion.li>
                )
              })}
            </ol>
            <div className="mt-3 grid gap-2 text-[11px] text-ink-soft sm:grid-cols-3">
              {(['go', 'caution', 'nogo'] as const).map((k) => { const g = GO_META[k]; return <div key={k} className="rounded-xl border border-white/[0.06] p-2"><span className="font-medium" style={{ color: g.color }}>{g.label}</span><div className="mt-0.5 text-ink-mute">{k === 'go' ? 'In your personal range' : k === 'caution' ? 'Watch state or a weaker weekly check' : 'Drift, fever, or an active solar storm'}</div></div> })}
            </div>
            <div className="mt-3"><Prov ids={['hazGravity', 'hrpRisks', 'donki']} label="Based on:" /></div>
          </Panel>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
          <Panel title="Landing readiness" kicker="Return to gravity" tour="landing">
            <div className="flex items-center gap-5">
              <Gauge value={landing.score} />
              <div className="min-w-0">
                <div className="text-lg font-semibold">{landing.score >= 80 ? 'Ready for gravity' : landing.score >= 60 ? 'Ready with support' : 'Needs reconditioning'}</div>
                <p className="mt-1 text-sm text-ink-soft">Weighted from the systems that gravity transitions stress most: heart & vessels, balance, bones & muscles (30-day exercise adherence), sleep and immune status.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {landing.parts.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between text-sm"><span className="text-ink-soft">{p.name}</span><span className="num">{Math.round(p.score)}/{p.weight}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-white/10" aria-hidden><div className="h-full rounded-full transition-all" style={{ width: `${(p.score / p.weight) * 100}%`, background: p.score / p.weight > 0.8 ? '#34D399' : p.score / p.weight > 0.55 ? '#F59E0B' : '#F43F5E' }} /></div>
                </li>
              ))}
            </ul>
            <div className="mt-3"><Prov ids={['hazGravity', 'hrpRisks']} label="Why these systems:" /></div>
          </Panel>
          <Panel title="Return-to-Earth handoff report" kicker={`For the recovery ${h.t('surgeon')}`} right={<button className="btn-ghost" onClick={() => download(`halo-handoff-${h.crewId}-D${h.day}.md`, landing.report, 'text/markdown')}><Download size={15} aria-hidden /> Export</button>}>
            <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-space-950/60 p-4 text-[12.5px] leading-relaxed text-ink-soft scroll-thin">{landing.report}</pre>
          </Panel>
        </div>
      )}
    </div>
  )
}

function useLanding() {
  const h = useHalo()
  return useMemo(() => {
    const crew = h.mission.crew.find((c) => c.id === h.crewId)!
    const st = h.states
    const stScore = (s: DriftState) => (s === 'drift' ? 0.3 : s === 'watch' ? 0.7 : 1)
    const ex = h.analysis[h.crewId].exercise
    let done = 0, plan = 0
    for (let i = Math.max(idxOf(1), h.idx - 29); i <= h.idx; i++) { const v = ex[i].value; plan += ex[i].center; if (v != null) done += Math.min(v, ex[i].center) }
    const adherence = plan ? done / plan : 1
    const bal = h.allTests.filter((t) => t.kind === 'balance' && t.day <= h.day).at(-1)
    const parts = [
      { name: 'Heart & vessels (orthostatic tolerance)', weight: 25, score: 25 * Math.min(stScore(st.hr), stScore(st.sbp)) },
      { name: 'Balance & coordination', weight: 20, score: bal ? (bal.value < 0 ? 8 : 20) : 12 },
      { name: 'Bones & muscles (30-day exercise adherence)', weight: 25, score: 25 * Math.max(0, Math.min(1, (adherence - 0.5) / 0.5)) },
      { name: 'Sleep & alertness', weight: 15, score: 15 * Math.min(stScore(st.sleep), stScore(st.pvt)) },
      { name: 'Immune / infection', weight: 15, score: h.latest.temp != null && h.latest.temp >= 38 ? 3 : 15 * stScore(st.temp) },
    ]
    const score = Math.round(parts.reduce((a, p) => a + p.score, 0))
    const flags = h.detections.filter((d) => d.crewId === h.crewId && d.personalDay <= h.day)
    const report = [
      `# HALO return-to-Earth handoff`,
      `Crew member: ${crew.name} (${crew.role}) · fictional, simulated data`,
      `Mission day ${h.day} (${fmtDate(h.day)}) · Landing readiness ${score}/100 (illustrative)`,
      ``,
      `## Mission exposure`,
      `- Cumulative radiation dose: ${cumulativeDose(h.mission, h.day)} mSv (career limit 600 mSv, NASA-STD-3001)`,
      `- Weightless days so far: ${Math.max(0, h.day)}`,
      `- 30-day exercise adherence: ${Math.round(adherence * 100)}% of personal plan`,
      ``,
      `## Drift episodes flagged by HALO`,
      ...(flags.length ? flags.map((f) => `- D${f.personalDay}: ${IND[f.indicator].name}${f.populationDay ? ` (fixed threshold: D${f.populationDay})` : ' (fixed threshold: never flagged)'}`) : ['- None']),
      ``,
      `## Current status vs personal baseline`,
      ...(['hr', 'sbp', 'dbp', 'temp', 'sleep', 'pvt', 'exercise'] as const).map((k) => `- ${IND[k].name}: ${h.latest[k] ?? '—'} ${IND[k].unit} (${st[k]})`),
      ``,
      `## Recommendations for recovery team`,
      `- Expect lightheadedness on standing: monitor orthostatic tolerance first 24–72 h.`,
      `- Balance and walking may be impaired: assisted egress, no driving or critical tasks until cleared.`,
      `- Bone and muscle reconditioning programme; review bone density.`,
      ...(st.sleep !== 'ok' ? ['- Sleep debt present: protect sleep during readaptation.'] : []),
      ``,
      `Sources: NASA HRP Gravity Fields hazard; NASA HRP Risks of Human Spaceflight; NASA-STD-3001.`,
      `Not a medical device. Thresholds and weights illustrative.`,
    ].join('\n')
    return { score, parts, report }
  }, [h.mission, h.crewId, h.states, h.analysis, h.idx, h.allTests, h.day, h.latest, h.detections])
}

function Gauge({ value }: { value: number }) {
  const R = 52, C = Math.PI * R
  const col = value >= 80 ? '#34D399' : value >= 60 ? '#F59E0B' : '#F43F5E'
  return (
    <svg width="150" height="96" viewBox="0 0 140 90" className="shrink-0" role="img" aria-label={`Landing readiness ${value} out of 100`}>
      <path d="M18,80 A52,52 0 0 1 122,80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
      <motion.path d="M18,80 A52,52 0 0 1 122,80" fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - value / 100) }} transition={{ duration: 0.6 }} />
      <text x="70" y="74" textAnchor="middle" className="num" fontSize="26" fontWeight="600" fill="#E6EDF7">{value}</text>
    </svg>
  )
}

/** Pre-EVA checklist built from today's data with guideline categories (AHA BP, CDC fever, PVT-B, space weather). */
function PreEva() {
  const h = useHalo()
  const pvt = h.allTests.filter((t) => t.kind === 'pvt' && t.day === h.day).at(-1)
  const bal = h.allTests.filter((t) => t.kind === 'balance' && t.day <= h.day).at(-1)
  const bp = bpCategory(h.latest.sbp, h.latest.dbp)
  const items: { k: string; ok: boolean | null; v: string }[] = [
    { k: 'Alertness (reaction time vs baseline)', ok: h.states.pvt !== 'drift', v: pvt ? pvt.detail.split(',').slice(0, 2).join(',') : `${h.latest.pvt ?? '—'} ms · run PVT-B in Log & Measure` },
    { k: 'Balance check (latest)', ok: bal ? bal.value >= 0 : null, v: bal ? bal.detail.split(' (')[0] : 'No check yet' },
    { k: 'Blood pressure category (AHA)', ok: bp ? bp.tone === 'ok' || bp.tone === 'info' : null, v: bp ? `${h.latest.sbp}/${h.latest.dbp} · ${bp.label}` : '—' },
    { k: 'No fever (CDC ≥38.0 °C)', ok: h.latest.temp != null ? h.latest.temp < 38 : null, v: h.latest.temp != null ? `${h.latest.temp} °C` : '—' },
    { k: 'Sleep last night (AASM ≥7 h)', ok: h.latest.sleep != null ? h.latest.sleep >= 7 : null, v: h.latest.sleep != null ? `${h.latest.sleep} h` : '—' },
    { k: 'Space weather quiet', ok: !(h.speActive || h.watchActive), v: h.speActive ? 'Solar particle event active' : h.watchActive ? 'Watch: large flare/CME on record' : 'No watch' },
  ]
  return (
    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3" data-pre-eva>
      <div className="flex items-center justify-between"><div className="text-sm font-medium">Before the hatch opens</div><span className="num text-xs text-ink-mute">{items.filter((i) => i.ok).length}/{items.length} clear</span></div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i.k} className="flex items-center gap-2 text-[12.5px]">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${i.ok == null ? 'bg-white/10 text-ink-mute' : i.ok ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn'}`} aria-hidden>{i.ok == null ? '–' : i.ok ? '✓' : '!'}</span>
            <span className="text-ink-soft">{i.k}</span><span className="ml-auto break-words pl-2 text-right text-ink-mute">{i.v}</span>
            <span className="sr-only">{i.ok == null ? 'not available' : i.ok ? 'clear' : 'needs attention'}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2"><Prov ids={['ahaBp', 'cdcFever', 'aasmSleep', 'pvtB']} /></div>
    </div>
  )
}
