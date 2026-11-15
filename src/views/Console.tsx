import { useMemo, useState } from 'react'
import { classify, type Tone } from '../data/clinical'
const TONE: Record<Tone, string> = { ok: 'border-white/10 text-ink-mute', info: 'border-sky-400/30 text-sky-300', warn: 'border-warn/40 text-warn', bad: 'border-alert/50 text-alert' }
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Award, CalendarClock, ChevronRight, Eye, Footprints, HelpCircle, Satellite, Sun, X, Zap } from 'lucide-react'
import { ENV, IND, INDICATORS, fmtDelay, type IndicatorId, type EnvId } from '../data/domain'
import { useHalo } from '../state/store'
import { SCRIPT, cumulativeDose, fmtDate, MISSION_DAYS, SPE_DAY, SPE_DOSE_ILLUSTRATIVE } from '../sim/mission'
import { FACTS } from '../data/sources'
import { Illustrative, LevelPill, Panel, Prov, Simulated, StatePill, STATE_META, lens } from '../ui/kit'
import { Spark } from '../ui/charts'
import { WhyDrawer } from '../ui/why'

export function ConsoleView() {
  const h = useHalo()
  const [why, setWhy] = useState<IndicatorId | null>(null)
  const crew = h.mission.crew.find((c) => c.id === h.crewId)!
  const alerts = h.triage.hits.filter((x) => x.level !== 'self')
  const dose = cumulativeDose(h.mission, h.day)
  const feed = useMemo(() => {
    const items: { day: number; title: string; body: string; tone: 'info' | 'warn' | 'alert' | 'ok'; donki?: string[] }[] = []
    for (const s of SCRIPT) if (s.day <= h.day) items.push({ day: s.day, title: s.title, body: s.detail, tone: s.kind === 'spe' ? 'alert' : s.kind === 'spaceweather' || s.kind === 'fever' ? 'warn' : 'info', donki: s.donki })
    for (const d of h.detections) if (d.crewId === h.crewId && d.personalDay <= h.day)
      items.push({ day: d.personalDay, title: `HALO flagged ${IND[d.indicator].name.toLowerCase()} drift`, body: d.populationDay == null ? 'Caught against personal baseline; the fixed population threshold never flagged it.' : `Population threshold would flag it on day ${d.populationDay} (${d.leadDays} days later).`, tone: 'warn' })
    return items.sort((a, b) => b.day - a.day).slice(0, 8)
  }, [h.day, h.detections, h.crewId])
  const env = ENV[h.env]

  return (
    <div className="space-y-5">
      {h.speActive && <SpeBanner />}
      {/* Hero */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel tour="hero" className="relative overflow-hidden">
          <HeroScene env={h.env} day={h.day} />
          <div className="relative z-10">
          <div className="flex flex-col-reverse items-start justify-between gap-4 md:flex-row">
            <div className="min-w-0 flex-1">
              <div className="label">Mission Console · {env.name}</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[30px] md:leading-[1.15]">When {h.earthMode ? 'the specialist' : 'Earth'} is {fmtDelay(h.delaySec)} away, HALO is {crew.name.split(' ')[0]}’s health copilot.</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">HALO learns each {h.t('astronaut')}’s own baseline, spots drift before it becomes an emergency, ties every change to NASA’s five spaceflight hazards, and says exactly what to do next.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="crewSel">Crew member</label>
                <select id="crewSel" value={h.crewId} onChange={(e) => h.set('crewId', e.target.value)} className="focus-ring rounded-xl border border-white/10 bg-space-800 px-3 py-1.5 text-sm">
                  {h.mission.crew.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
                </select>
                <Simulated /><span className="text-xs text-ink-mute">Mission day {h.day} · {fmtDate(h.day)} (scenario calendar)</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => h.storyFrom(1)} data-quick-story>▶ 60-second story</button>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => h.setDay(SPE_DAY)} data-quick-storm><Zap size={13} className="text-warn" aria-hidden /> Solar storm · D{SPE_DAY}</button>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => h.setDay(157)} data-quick-fever><Zap size={13} className="text-alert" aria-hidden /> Autonomous triage · D157</button>
                {h.day === MISSION_DAYS && <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => h.set('debriefSeen', false)} data-quick-debrief><Award size={13} className="text-teal" aria-hidden /> Mission debrief</button>}
              </div>
            </div>
            <ChiRing />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-space-900/95 p-3" data-tour="triage-status">
              <div className="label">Triage now</div>
              <div className="mt-2"><LevelPill level={h.triage.level} big /></div>
              <button className="mt-2 inline-flex items-center gap-1 text-xs text-teal hover:underline" onClick={() => h.go('triage')}>Open protocol <ChevronRight size={12} /></button>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-space-900/95 p-3">
              <div className="label">{h.t('ground')} link</div>
              <div className="mt-2 flex items-center gap-2 whitespace-nowrap text-sm"><Satellite size={15} className="shrink-0 text-ice" aria-hidden /><span className="num">{fmtDelay(h.delaySec)}</span><span className="text-ink-mute">one-way</span></div>
              <div className="mt-1 text-xs text-ink-soft">{h.autonomy === 'autonomous' ? 'Autonomous mode: HALO acts first, then reports.' : h.autonomy === 'delayed' ? 'Delayed assist: report, then act if no reply.' : `Linked: report to ${h.t('surgeon')}.`}</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-space-900/95 p-3">
              <div className="label">Radiation (mission)</div>
              <div className="mt-2 flex items-baseline gap-1"><span className="num text-lg">{dose}</span><span className="text-xs text-ink-mute">mSv of 600 mSv career limit</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10" aria-hidden><div className="h-full rounded-full bg-warn" style={{ width: `${Math.min(100, (dose / 600) * 100)}%` }} /></div>
              <button className="mt-2 inline-flex items-center gap-1 text-xs text-teal hover:underline" onClick={() => h.go('radiation')}>Dose ledger <ChevronRight size={12} /></button>
            </div>
          </div>
        </div>
        </Panel>

        <Panel title="Active alerts" kicker={`${alerts.length} open`} tour="alerts" right={<Illustrative text="Rules illustrative" />}>
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-ok/25 bg-ok/[0.06] p-4 text-sm text-ok">All indicators within {crew.name.split(' ')[0]}’s personal range. Keep the routine going.</div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button onClick={() => (a.indicators[0] ? setWhy(a.indicators[0]) : h.go('triage'))} className="focus-ring w-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{a.title}</span><LevelPill level={a.level} /></div>
                    <div className="mt-1 text-xs text-ink-soft">{a.why}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-teal">{a.indicators[0] ? 'Why flagged?' : 'Open protocol'} <ArrowRight size={12} /></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-ink-soft">{h.triage.groundNote}</div>
        </Panel>
      </div>

      {h.day === MISSION_DAYS && !h.debriefSeen && <Debrief onClose={() => h.set('debriefSeen', true)} />}

      {/* Indicator cards: two balanced rows of five */}
      <div data-tour="cards" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="label">Indicators vs {crew.name.split(' ')[0]}’s personal baseline</h2><span className="text-xs text-ink-mute">Shaded band = personal range · tap a card for “Why?”</span></div>
        {([['Vitals', ['hr', 'sbp', 'dbp', 'temp', 'glucose']], ['Behaviour & performance', ['sleep', 'mood', 'exercise', 'pvt']]] as const).map(([group, ids]) => (
          <div key={group}>
            <div className="mb-2 text-[12px] font-medium text-ink-soft">{group}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {ids.map((id) => <IndCard key={id} id={id as IndicatorId} onWhy={setWhy} />)}
              {group !== 'Vitals' && <WeeklyChecks />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Mission feed" kicker="What HALO noticed" tour="feed" right={<Prov ids={['donki']} />}>
          <ol className="relative space-y-3 border-l border-white/10 pl-4">
            {feed.map((f, k) => (
              <li key={k} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: f.tone === 'alert' ? '#F43F5E' : f.tone === 'warn' ? '#F59E0B' : f.tone === 'ok' ? '#34D399' : '#60A5FA' }} aria-hidden />
                <div className="flex flex-wrap items-baseline gap-2"><span className="num text-[11px] text-ink-mute">D{f.day}</span><span className="text-sm font-medium">{f.title}</span>{f.donki && <span className="chip border-teal/25 px-1.5 py-0 text-[10px] text-teal">Real event · NASA CCMC DONKI</span>}</div>
                <div className="text-xs text-ink-soft">{f.body}</div>
              </li>
            ))}
            {feed.length === 0 && <li className="text-sm text-ink-mute">Press “Play Mars Transit Story” to watch HALO work.</li>}
          </ol>
        </Panel>
        <Panel title="Next scheduled measurements" kicker={env.name} tour="schedule">
          <ul className="space-y-2">
            {env.routines.map((r, k) => (
              <li key={r} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><CalendarClock size={14} className="text-teal" aria-hidden />{r}</span>
                <span className="num text-xs text-ink-mute">{['07:00', '07:20', '10:30', '16:00', '21:30'][k] ?? '—'}</span>
              </li>
            ))}
          </ul>
          <button className="btn-ghost mt-3 w-full" onClick={() => h.go('log')}>Log a measurement <ArrowRight size={14} /></button>
          <div className="mt-3 text-[11px] text-ink-mute">Routines change with the environment. Mars transit adds a reaction test and weekly vision check.</div>
        </Panel>
      </div>
      <WhyDrawer ind={why} onClose={() => setWhy(null)} />
    </div>
  )
}

function ChiRing() {
  const h = useHalo()
  const [open, setOpen] = useState(false)
  const { score, parts, band } = h.chi
  const col = band === 'nominal' ? '#34D399' : band === 'watch' ? '#F59E0B' : '#F43F5E'
  const R = 46, C = 2 * Math.PI * R
  return (
    <div className="relative shrink-0 self-center md:self-start" data-tour="chi">
      <button onClick={() => setOpen((o) => !o)} className="focus-ring flex flex-col items-center rounded-2xl p-1" aria-expanded={open}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <motion.circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" transform="rotate(-90 60 60)"
            strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - score / 100) }} transition={{ duration: 0.5 }} />
          <text x="60" y="58" textAnchor="middle" className="num" fontSize="28" fontWeight="600" fill="#E6EDF7">{score}</text>
          <text x="60" y="78" textAnchor="middle" fontSize="10" fill="#A9B6CC" letterSpacing="1.5">{band.toUpperCase()}</text>
        </svg>
        <span className="mt-1 text-[11px] text-ink-mute">Crew Health Index · explain<span className="sr-only"> ({band}, out of 100). Show how it is computed.</span></span>
      </button>
      {open && (
        <div className="panel-raised absolute right-0 top-full z-20 mt-2 w-72 p-3 text-sm shadow-2xl">
          <div className="label mb-2">How the index is computed</div>
          <p className="text-xs text-ink-soft">Starts at 100. Each indicator outside your personal range subtracts points (drift more than watch; key indicators weigh more). Active hazards subtract too.</p>
          <ul className="mt-2 space-y-1">
            {parts.length === 0 && <li className="text-xs text-ok">No deductions today.</li>}
            {parts.map((p) => <li key={p.label} className="flex justify-between text-xs"><span className="text-ink-soft">{p.label}</span><span className="num text-alert">{p.delta}</span></li>)}
          </ul>
          <div className="mt-2"><Illustrative text="Weights illustrative" /></div>
        </div>
      )}
    </div>
  )
}

function SpeBanner() {
  const h = useHalo()
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-alert/50 bg-alert/[0.09] p-4" role="alert" data-tour="spe">
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative flex h-9 w-9 items-center justify-center"><span className="pulse-ring absolute inset-0 rounded-full bg-alert/40" /><Zap className="relative text-alert" size={20} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-alert">Solar particle event: shelter now</div>
          <div className="text-sm text-ink-soft">Scenario based on the real 20 May 2024 storm (NASA CCMC DONKI fast halo CME, ≈2,680 km/s). NASA reported {FACTS.may20Dose.value} at the Mars surface.</div>
        </div>
        <button className="btn-danger" onClick={() => h.go('radiation')}><AlertTriangle size={15} aria-hidden /> Open shelter checklist</button>
        <button className="btn-ghost" onClick={() => h.go('triage')}><Sun size={15} aria-hidden /> Triage</button>
      </div>
    </motion.div>
  )
}

function IndCard({ id, onWhy }: { id: IndicatorId; onWhy: (i: IndicatorId) => void }) {
  const h = useHalo()
  const ind = IND[id]
  const st = h.states[id]
  const v = h.latest[id]
  const res = h.analysis[h.crewId][id]
  const meta = STATE_META[st]
  const cls = classify(id, v, h.latest)
  return (
    <motion.button layout onClick={() => onWhy(id)} data-card={id}
      className={`focus-ring panel tap relative overflow-hidden p-3 text-left hover:border-white/15 ${lens(h.hazard, ind.hazards)}`}
      style={{ borderColor: st === 'drift' ? meta.color + '77' : st === 'watch' ? meta.color + '44' : undefined }}
>
      {(st === 'drift' || st === 'watch') && <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: meta.color }} aria-hidden />}
      <div className="flex items-center justify-between gap-1"><span className="truncate text-[12px] text-ink-soft">{ind.short}</span><HelpCircle size={12} className="shrink-0 text-ink-mute" aria-hidden /></div>
      <div className="mt-1 flex items-baseline gap-1"><span className="num text-[22px] font-semibold">{v ?? '—'}</span><span className="text-[11px] text-ink-mute">{ind.unit}</span></div>
      <div className="my-1.5"><Spark res={res} day={h.day} color={meta.color} /></div>
      <div className="flex flex-wrap items-center gap-1"><StatePill state={st} small />{cls && <span className={`truncate rounded-full border px-1.5 py-[1px] text-[10px] ${TONE[cls.tone]}`} title="Category from published clinical guideline">{cls.label}</span>}</div>
      <span className="sr-only">. Open explanation of {ind.name.toLowerCase()}</span>
    </motion.button>
  )
}

function WeeklyChecks() {
  const h = useHalo()
  const last = (k: 'vision' | 'balance') => h.allTests.filter((t) => t.kind === k && t.day <= h.day).at(-1)
  const v = last('vision'), b = last('balance')
  return (
    <button onClick={() => h.go('log')} className="focus-ring panel tap p-3 text-left hover:border-white/15" data-card="weekly">
      <div className="text-[12px] text-ink-soft">Weekly checks</div>
      <div className="mt-2 space-y-1.5 text-[12px]">
        <div className="flex items-center gap-1.5"><Eye size={13} className="text-teal" aria-hidden /><span className="truncate">Vision: {v ? v.detail.split(' (')[0] : '—'}</span></div>
        <div className="flex items-center gap-1.5"><Footprints size={13} className="text-teal" aria-hidden /><span className="truncate">Balance: {b ? b.detail.split(' (')[0] : '—'}</span></div>
      </div>
      <div className="mt-2"><StatePill state={v && v.value < 0 || b && b.value < 0 ? 'watch' : 'ok'} small /></div>
    </button>
  )
}

/** Environment-themed scene behind the hero: Earth limb (ISS), lunar horizon (Moon), Earth→Mars trajectory with live position (Mars), habitat (HERA). */
function HeroScene({ env, day }: { env: EnvId; day: number }) {
  const p = Math.min(1, day / MISSION_DAYS)
  const path = 'M250,250 C330,170 410,215 488,150'
  const bez = (t: number) => {
    const P = [[250, 250], [330, 170], [410, 215], [488, 150]]
    const u = 1 - t
    return [u ** 3 * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0], u ** 3 * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1]]
  }
  const [sx, sy] = bez(p)
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full opacity-70 md:block" viewBox="0 0 520 260" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      <defs>
        <radialGradient id="hs-earth" cx="30%" cy="30%"><stop offset="0" stopColor="#60A5FA" /><stop offset="1" stopColor="#1E3A8A" /></radialGradient>
        <radialGradient id="hs-mars" cx="35%" cy="30%"><stop offset="0" stopColor="#F97316" /><stop offset="1" stopColor="#7C2D12" /></radialGradient>
        <radialGradient id="hs-moon" cx="35%" cy="30%"><stop offset="0" stopColor="#CBD5E1" /><stop offset="1" stopColor="#475569" /></radialGradient>
        <linearGradient id="hs-fade" x1="0" x2="1"><stop offset="0" stopColor="#0F1626" stopOpacity=".9" /><stop offset=".4" stopColor="#0F1626" stopOpacity=".5" /><stop offset="1" stopColor="#0F1626" stopOpacity="0" /></linearGradient>
      </defs>
      {Array.from({ length: 46 }, (_, k) => <circle key={k} cx={(k * 97) % 520} cy={(k * 53) % 260} r={k % 7 === 0 ? 1.1 : 0.6} fill="#fff" opacity={0.35} />)}
      {env === 'leo' && <><circle cx="470" cy="420" r="260" fill="url(#hs-earth)" opacity=".55" /><circle cx="470" cy="420" r="266" fill="none" stroke="#60A5FA" strokeOpacity=".35" strokeWidth="6" /><g transform="translate(380,90)" opacity=".8"><rect x="-14" y="-3" width="28" height="6" fill="#A9B6CC" /><rect x="-30" y="-10" width="12" height="20" fill="#2DD4BF" opacity=".6" /><rect x="18" y="-10" width="12" height="20" fill="#2DD4BF" opacity=".6" /></g></>}
      {env === 'moon' && <><path d="M0,240 Q260,200 520,230 L520,260 L0,260 Z" fill="url(#hs-moon)" opacity=".5" />{[[300, 236, 14], [420, 230, 9], [200, 242, 6]].map(([x, y, r], k) => <ellipse key={k} cx={x} cy={y} rx={r} ry={r / 3} fill="#334155" opacity=".6" />)}<circle cx="430" cy="70" r="22" fill="url(#hs-earth)" opacity=".85" /></>}
      {env === 'mars' && <><circle cx="250" cy="252" r="9" fill="url(#hs-earth)" opacity=".9" /><circle cx="502" cy="140" r="24" fill="url(#hs-mars)" opacity=".7" /><path d={path} fill="none" stroke="#A9B6CC" strokeOpacity=".3" strokeDasharray="3 6" /><path d={path} fill="none" stroke="#2DD4BF" strokeOpacity=".7" strokeWidth="2" pathLength={1} strokeDasharray={`${p} 1`} /><circle cx={sx} cy={sy} r="5" fill="#2DD4BF" /><circle cx={sx} cy={sy} r="11" fill="none" stroke="#2DD4BF" strokeOpacity=".4" className="pulse-ring" /></>}
      {env === 'hera' && <><rect x="0" y="232" width="520" height="28" fill="#1C2840" opacity=".7" /><g transform="translate(400,150)" opacity=".75"><rect x="-50" y="0" width="100" height="82" rx="14" fill="#141D31" stroke="#60A5FA" strokeOpacity=".5" /><circle cx="-20" cy="30" r="9" fill="#60A5FA" opacity=".4" /><circle cx="20" cy="30" r="9" fill="#60A5FA" opacity=".4" /></g></>}
      <rect x="0" y="0" width="520" height="260" fill="url(#hs-fade)" />
    </svg>
  )
}

function Debrief({ onClose }: { onClose: () => void }) {
  const h = useHalo()
  const eps = h.detections.filter((d) => d.crewId === h.crewId)
  const withPop = eps.filter((d) => d.populationDay != null)
  const never = eps.filter((d) => d.populationDay == null).length
  const avgLead = withPop.length ? Math.round(withPop.reduce((a, d) => a + (d.leadDays ?? 0), 0) / withPop.length) : null
  const saved = SPE_DOSE_ILLUSTRATIVE.unsheltered - SPE_DOSE_ILLUSTRATIVE.sheltered
  const packets = h.messages.filter((m) => m.dir === 'up').length
  let decisions = 0, prev = ''
  for (let d = 1; d <= MISSION_DAYS; d++) { const l = h.derivedFor(h.crewId, d).triage.level; if (l !== prev) { decisions++; prev = l } }
  const stat = (k: string, v: string, sub: string) => <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><div className="label">{k}</div><div className="num mt-1 text-3xl font-semibold text-ink">{v}</div><div className="mt-1 text-xs text-ink-mute">{sub}</div></div>
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel relative overflow-hidden border-teal/40 p-5 md:p-6" aria-label="Mission debrief" data-debrief>
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-teal/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div><div className="label text-teal">Mission debrief · day {MISSION_DAYS}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">180-day Mars transit complete. Here is what HALO caught.</h2></div>
        <button className="btn-ghost px-2" onClick={onClose} aria-label="Close debrief"><X size={16} /></button>
      </div>
      <div className="relative mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stat('Drift episodes caught', String(eps.length), `${never} never flagged by a fixed threshold${avgLead != null ? ` · others ${avgLead} days earlier on average` : ''}`)}
        {stat('Dose avoided by sheltering', `≈${saved} mSv`, `Illustrative: +${SPE_DOSE_ILLUSTRATIVE.sheltered} vs +${SPE_DOSE_ILLUSTRATIVE.unsheltered} mSv on D${SPE_DAY}; limit 250 mSv/event`)}
        {stat('Mission dose', `${cumulativeDose(h.mission, MISSION_DAYS)} mSv`, 'of the 600 mSv career limit (NASA-STD-3001)')}
        {stat('Decisions logged', String(decisions), `triage changes, all in the hash-chained Black Box · ${packets} packets sent this session`)}
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => h.go('packet')}>Open the final packet</button><button className="btn-ghost" onClick={() => h.go('readiness')}>Landing readiness</button><button className="btn-ghost" onClick={() => h.go('blackbox')}>Black Box</button></div>
    </motion.section>
  )
}
