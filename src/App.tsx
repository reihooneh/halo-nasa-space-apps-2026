import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, BookOpen, Box, Gauge, Globe2, HeartPulse, LayoutDashboard, LineChart, Pause, Play, Radio, RotateCcw, Satellite, Settings2,
  ShieldAlert, ShieldCheck, Moon, Waves, Stethoscope, Sun, Users, FlaskConical, Compass, FileText, Sparkles, X, Rewind, Rocket, SlidersHorizontal, Zap, PencilLine,
} from 'lucide-react'
import { HAZARDS, ENVIRONMENTS, ENV, fmtDelay, type HazardId } from './data/domain'
import { useHalo, DEFAULT_DAY, type ViewId } from './state/store'
import { fmtDate, MISSION_DAYS, SPE_DAY } from './sim/mission'
import { Kbd, Seg } from './ui/kit'
import { ConsoleView } from './views/Console'
import { BodyView } from './views/Body'
import { LogView } from './views/Log'
import { InsightsView } from './views/Insights'
import { RadiationView } from './views/Radiation'
import { GroundView } from './views/Ground'
import { TriageView } from './views/Triage'
import { PacketView } from './views/Packet'
import { CrewView } from './views/Crew'
import { LabView } from './views/Lab'
import { BlackBoxView } from './views/BlackBox'
import { EarthView } from './views/Earth'
import { SourcesView } from './views/Sources'
import { NextView } from './views/Next'
import { ReadinessView } from './views/Readiness'
import { JudgeTour } from './views/Judge'
import { SensorsView } from './views/Sensors'
import { SolView } from './views/Sol'
import { ClinicalView } from './views/Clinical'
import { VoiceButton } from './voice/VoiceButton'
import { HaloLockup, OrbitalMark } from './ui/Mark'

type NavItem = { id: ViewId; label: string; earth?: string; Icon: typeof Activity; group: string; blurb: string }
export const GROUPS: Record<string, { n: string; text: string }> = {
  Monitor: { n: '01', text: 'See the crew’s health' },
  Act: { n: '02', text: 'Decide and respond' },
  Evidence: { n: '03', text: 'Why you can trust it' },
  Impact: { n: '04', text: 'Beyond the mission' },
}
const NAV: NavItem[] = [
  { id: 'console', label: 'Mission Console', earth: 'Care Console', Icon: LayoutDashboard, group: 'Monitor', blurb: 'One screen: who needs attention, why, and what to do next.' },
  { id: 'body', label: 'Body Map', Icon: HeartPulse, group: 'Monitor', blurb: 'Seven body systems, each linked to NASA risks and today’s readings.' },
  { id: 'log', label: 'Log & Measure', Icon: Activity, group: 'Monitor', blurb: 'One-tap logging and short tests: reaction (PVT-B), vision, balance, mood (PHQ-2).' },
  { id: 'sensors', label: 'Sensors & Validation', Icon: Waves, group: 'Monitor', blurb: 'Camera pulse and Bluetooth strap, checked against each other with Bland–Altman.' },
  { id: 'insights', label: 'Drift & Forecast', Icon: LineChart, group: 'Monitor', blurb: 'Personal-baseline drift, 7-day forecast and what-if countermeasures.' },
  { id: 'radiation', label: 'Radiation & Space Weather', Icon: Sun, group: 'Monitor', blurb: 'Dose ledger, real NASA DONKI storms and a 3D view of the transfer.' },
  { id: 'triage', label: 'Autonomous Triage', earth: 'Offline Triage', Icon: Stethoscope, group: 'Act', blurb: 'Guideline-based, explainable rules that act when Earth is too far away.' },
  { id: 'readiness', label: 'EVA & Landing Readiness', earth: 'Fitness-for-task', Icon: Rocket, group: 'Act', blurb: 'Go/No-Go for spacewalks and a landing-readiness score with handoff report.' },
  { id: 'sol', label: 'Sol Planner', earth: 'Shift Planner', Icon: Moon, group: 'Act', blurb: 'Sleep and light plan on the 24 h 39 min Mars day.' },
  { id: 'ground', label: 'Ground Link', earth: 'Specialist Link', Icon: Satellite, group: 'Act', blurb: 'Messages that obey the real light-time delay.' },
  { id: 'packet', label: 'Flight Surgeon Packet', earth: 'Specialist Packet', Icon: FileText, group: 'Act', blurb: 'A one-page summary ready to downlink, print or export.' },
  { id: 'crew', label: 'Crew Pulse', earth: 'Team Pulse', Icon: Users, group: 'Act', blurb: 'Whole-crew view with consent-based privacy.' },
  { id: 'clinical', label: 'Clinical Reference', Icon: ShieldCheck, group: 'Evidence', blurb: 'Every threshold, the guideline it comes from, and the NASA data behind HALO.' },
  { id: 'lab', label: 'Simulation Lab', Icon: FlaskConical, group: 'Evidence', blurb: '1,000 seeded missions: how early does personal drift beat a fixed rule?' },
  { id: 'blackbox', label: 'Health Black Box', Icon: Box, group: 'Evidence', blurb: 'Tamper-evident, hash-chained record of every reading and decision.' },
  { id: 'sources', label: 'Science & Sources', Icon: BookOpen, group: 'Evidence', blurb: 'Every number with its source.' },
  { id: 'next', label: 'Limitations & Next Steps', Icon: Compass, group: 'Evidence', blurb: 'What HALO can’t claim yet, and what would make it flight-ready.' },
  { id: 'earth', label: 'Earth Mode', Icon: Globe2, group: 'Impact', blurb: 'The same engine for remote clinics, Antarctic stations and home care.' },
]

const VIEWS: Record<ViewId, () => ReactNode> = {
  console: () => <ConsoleView />, body: () => <BodyView />, log: () => <LogView />, insights: () => <InsightsView />, radiation: () => <RadiationView />,
  ground: () => <GroundView />, triage: () => <TriageView />, packet: () => <PacketView />, crew: () => <CrewView />, lab: () => <LabView />,
  blackbox: () => <BlackBoxView />, earth: () => <EarthView />, sources: () => <SourcesView />, next: () => <NextView />, readiness: () => <ReadinessView />,
  sensors: () => <SensorsView />, sol: () => <SolView />, clinical: () => <ClinicalView />,
}

export default function App() {
  const h = useHalo()
  const [settings, setSettings] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const label = (n: NavItem) => (h.earthMode && n.earth ? n.earth : n.label)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || h.judge || !h.welcomed) return
      if (e.key === ' ' && !(e.target as HTMLElement)?.closest('button,[role="button"]')) { e.preventDefault(); h.playing ? h.pause() : h.play() }
      else if (e.key === 'ArrowRight' && !e.shiftKey && !(e.target as HTMLElement)?.closest('[role="radiogroup"]')) h.setDay(h.day + 1)
      else if (e.key === 'ArrowLeft' && !e.shiftKey && !(e.target as HTMLElement)?.closest('[role="radiogroup"]')) h.setDay(h.day - 1)
      else if (e.key.toLowerCase() === 'j') h.setJudge(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [h])

  const env = ENV[h.env]
  const groups = Array.from(new Set(NAV.map((n) => n.group)))
  const playMain = () => (h.playing ? h.pause() : h.day >= MISSION_DAYS || h.day === DEFAULT_DAY ? h.storyFrom(1) : h.play())
  return (
    <div className={`halo-bg flex min-h-full ${h.earthMode ? 'earth-mode' : ''}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn-primary">Skip to content</a>
      <nav aria-label="Main" className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-white/[0.06] bg-space-950/70 px-3 py-4 lg:flex">
        <Brand />
        <div className="mt-5 flex-1 space-y-4 overflow-y-auto scroll-thin pr-1">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-2 pb-1.5"><div className="label flex items-baseline gap-1.5 whitespace-nowrap"><span className="num text-teal/80">{GROUPS[g].n}</span>{g}</div><div className="mt-0.5 whitespace-nowrap text-[11px] text-ink-mute">{GROUPS[g].text}</div></div>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === g).map((n) => (
                  <li key={n.id}>
                    <button data-nav={n.id} onClick={() => h.go(n.id)} aria-current={h.view === n.id ? 'page' : undefined}
                      className={`group focus-ring tap relative flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors ${h.view === n.id ? 'bg-teal/10 text-teal' : 'text-ink-soft hover:bg-white/[0.04] hover:text-ink'}`}>
                      {h.view === n.id && <motion.span layoutId="navpill" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-teal" />}
                      <n.Icon size={16} aria-hidden /> {label(n)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <button className="btn-ghost w-full justify-start text-xs" onClick={() => h.setJudge(true)} data-tour="judge-btn"><Sparkles size={14} aria-hidden /> Judge Mode <span className="ml-auto"><Kbd>J</Kbd></span></button>
          <button className="btn-ghost w-full justify-start text-xs" onClick={h.resetDemo} data-reset><RotateCcw size={14} aria-hidden /> Reset demo</button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-white/[0.06] bg-space-950/85 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-2.5 md:flex-wrap md:gap-3 md:px-6 md:py-3">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="hidden md:block" data-tour="env"><Seg label="Mission environment" value={h.env} onChange={(v) => h.set('env', v)} options={ENVIRONMENTS.map((e) => ({ v: e.id, label: e.short, title: e.name }))} /></div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5" data-tour="delay" title="One-way signal delay to Earth">
              <Radio size={14} className="shrink-0 text-ice" aria-hidden />
              <span className="num whitespace-nowrap text-sm text-ink">{fmtDelay(h.delaySec)}</span>
              <span className={`chip hidden px-2 py-0.5 text-[11px] sm:inline-flex ${h.autonomy === 'autonomous' ? 'border-warn/40 bg-warn/10 text-warn' : h.autonomy === 'delayed' ? 'border-ice/40 bg-ice/10 text-ice' : 'border-ok/40 bg-ok/10 text-ok'}`}>
                {h.autonomy === 'autonomous' ? 'Autonomous mode' : h.autonomy === 'delayed' ? 'Delayed assist' : `${h.t('ground')[0].toUpperCase()}${h.t('ground').slice(1)}-linked`}
              </span>
            </div>
            <span className="num hidden whitespace-nowrap rounded-lg bg-white/[0.04] px-2 py-1 text-xs text-ink sm:inline md:hidden">D{String(h.day).padStart(3, '0')}</span>
            <div className="ml-auto flex items-center gap-1.5 md:gap-2">
              <button className={`${h.playing ? 'btn-ghost' : 'btn-primary'} px-3 md:hidden`} onClick={playMain} aria-label={h.playing ? 'Pause story' : 'Play the 60-second story'}>{h.playing ? <Pause size={16} /> : <Play size={16} />}</button>
              <button className="btn-ghost px-3 md:hidden" aria-expanded={mobileOpen} aria-controls="mobile-controls" aria-label="Show mission controls" onClick={() => setMobileOpen((o) => !o)}><SlidersHorizontal size={16} /></button>
              <button className="btn-ghost hidden md:inline-flex" onClick={() => h.setJudge(true)} aria-label="Start Judge Mode tour"><Sparkles size={15} aria-hidden /><span className="hidden xl:inline">Judge Mode</span></button>
              <VoiceButton />
              <div className="relative">
                <button className="btn-ghost px-3" aria-expanded={settings} aria-label="Display and accessibility settings" onClick={() => setSettings((s) => !s)}><Settings2 size={15} aria-hidden /></button>
                {settings && <SettingsPop onClose={() => setSettings(false)} />}
              </div>
            </div>
          </div>
          <div id="mobile-controls" className={`${mobileOpen ? 'block' : 'hidden'} md:block`}>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] px-3 py-2 md:hidden">
              <Seg size="sm" label="Mission environment" value={h.env} onChange={(v) => h.set('env', v)} options={ENVIRONMENTS.map((e) => ({ v: e.id, label: e.short, title: e.name }))} />
              <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { h.setJudge(true); setMobileOpen(false) }}><Sparkles size={13} /> Judge tour</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] px-3 py-2.5 md:gap-3 md:px-6" data-tour="timeline">
              <button className={`hidden md:inline-flex ${h.playing ? 'btn-ghost' : 'btn-primary'}`} onClick={playMain} data-tour="play">
                {h.playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />} {h.playing ? 'Pause story' : 'Play Mars Transit Story'}
              </button>
              <button className="btn-ghost px-2.5" onClick={() => h.storyFrom(1)} aria-label="Restart story from day 1" title="Restart from day 1"><Rewind size={15} aria-hidden /></button>
              <button className="btn-ghost px-2.5 text-xs" onClick={() => { h.setDay(SPE_DAY); h.go('console') }} title="Jump to the solar storm (day 90)" data-jump-storm><Zap size={14} className="text-warn" aria-hidden /> D{SPE_DAY} storm</button>
              <Seg size="sm" label="Story speed" value={String(h.speed)} onChange={(v) => h.setSpeed(Number(v))} options={[{ v: '0.5', label: '0.5×' }, { v: '1', label: '1×' }, { v: '2', label: '2×' }]} />
              <div className="flex min-w-[220px] flex-1 basis-full items-center gap-3 xl:basis-0">
                <label htmlFor="day" className="label whitespace-nowrap">{h.t('mission')[0].toUpperCase() + h.t('mission').slice(1)} day</label>
                <input id="day" type="range" min={1} max={MISSION_DAYS} value={h.day} onChange={(e) => h.setDay(Number(e.target.value))} className="halo-range w-full" aria-valuetext={`Day ${h.day} of ${MISSION_DAYS}`} />
                <span className="num hidden whitespace-nowrap text-sm sm:inline"><span className="text-ink">D{String(h.day).padStart(3, '0')}</span><span className="text-ink-mute">/{MISSION_DAYS} · {fmtDate(h.day)}</span></span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.04] px-3 py-2 md:px-6" data-tour="lens">
              <span className="label mr-1">Hazard lens · RIDGE</span>
              {HAZARDS.map((hz) => (
                <button key={hz.id} onClick={() => h.setHazard(h.hazard === hz.id ? null : hz.id)} aria-pressed={h.hazard === hz.id}
                  className="focus-ring chip transition-colors" style={h.hazard === hz.id ? { borderColor: hz.color, color: hz.color, background: hz.color + '1f' } : { borderColor: 'rgba(255,255,255,0.1)', color: '#A9B6CC' }}>
                  <span className="num font-bold" style={{ color: hz.color }}>{hz.letter}</span>{hz.short}
                </button>
              ))}
              {h.hazard && <button className="chip border-white/10 text-ink-mute hover:text-ink" onClick={() => h.setHazard(null)}><X size={12} aria-hidden />Clear</button>}
              <span className="ml-auto hidden text-[11px] text-ink-mute xl:inline">{env.name} · {env.gravity}</span>
            </div>
          </div>
        </header>

        <HazardBanner hazard={h.hazard} />

        <main id="main" className="flex-1 px-3 py-5 md:px-6" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div key={h.view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
              {h.view !== 'console' && <PageHeader item={NAV.find((n) => n.id === h.view)!} label={label} />}
              {VIEWS[h.view]()}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav aria-label="Sections" className="no-print sticky bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-white/[0.06] bg-space-950/95 px-2 py-2 backdrop-blur lg:hidden scroll-thin">
          {NAV.map((n, i) => (<span key={n.id} className="contents">{i > 0 && NAV[i - 1].group !== n.group && <span className="mx-1 my-1 w-px shrink-0 bg-white/10" aria-hidden />}
            <button onClick={() => h.go(n.id)} aria-current={h.view === n.id ? 'page' : undefined} className={`focus-ring tap flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${h.view === n.id ? 'bg-teal/10 text-teal' : 'text-ink-soft'}`}>
              <n.Icon size={14} aria-hidden />{label(n)}
            </button></span>
          ))}
        </nav>

        <footer className="no-print border-t border-white/[0.06] px-4 py-3 text-[11.5px] text-ink-mute md:px-6">
          <span className="font-medium text-ink-soft">HALO by Orbital Vitals</span> · NASA Space Apps 2026 · <span className="font-medium text-ink-soft">Powered by NASA data</span> · NASA HRP hazards & risks, NASA-STD-3001, NASA CCMC DONKI space weather, CSA radiation research ·
          <span className="text-warn"> Simulated crew data · Not a medical device · Thresholds from published guidelines (AHA, CDC, ADA, AASM); protocols illustrative</span> · Fictional crew ·
          <span className="hidden md:inline"> Keys: <Kbd>Space</Kbd> play · <Kbd>←</Kbd><Kbd>→</Kbd> day · <Kbd>J</Kbd> judge tour</span>
        </footer>
      </div>

      {h.a11y.glove && <GloveBar />}
      <Toast />
      {!h.welcomed && !h.judge && <Welcome />}
      {h.judge && <JudgeTour />}
    </div>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  const h = useHalo()
  return (
    <button onClick={() => h.go('console')} className="focus-ring flex items-center gap-2.5 rounded-xl px-2 text-left" aria-label={compact ? 'HALO home' : undefined}>
      <HaloLockup compact={compact} />
    </button>
  )
}

function HazardBanner({ hazard }: { hazard: HazardId | null }) {
  const hz = HAZARDS.find((x) => x.id === hazard)
  return (
    <AnimatePresence>
      {hz && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="no-print overflow-hidden">
          <div className="mx-3 mt-4 rounded-2xl border px-4 py-3 md:mx-6" style={{ borderColor: hz.color + '55', background: hz.color + '0f' }} role="status">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <ShieldAlert size={16} style={{ color: hz.color }} aria-hidden />
              <span className="font-semibold" style={{ color: hz.color }}>Hazard lens: {hz.name}</span>
              <span className="text-ink-soft">{hz.summary}</span>
            </div>
            <div className="mt-1.5 text-xs text-ink-mute">Affects: {hz.effects.join(' · ')}. Panels not linked to this hazard are dimmed.</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SettingsPop({ onClose }: { onClose: () => void }) {
  const h = useHalo()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[aria-label="Display and accessibility settings"]')) onClose() }
    window.addEventListener('keydown', k); window.addEventListener('mousedown', c)
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('mousedown', c) }
  }, [onClose])
  const row = (checked: boolean, onChange: (v: boolean) => void, label: string, sub: string, id: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-white/[0.04]" htmlFor={id}>
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-[#2DD4BF]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-sm text-ink">{label}</span><span className="block text-xs text-ink-mute">{sub}</span></span>
    </label>
  )
  return (
    <div ref={ref} className="panel-raised absolute right-0 top-12 z-40 w-[min(340px,calc(100vw-24px))] p-3 shadow-2xl" role="dialog" aria-label="Display and accessibility">
      <div className="flex items-center justify-between px-2 pb-1"><div className="label">Modes</div><button className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Close settings"><X size={14} /></button></div>
      {row(h.a11y.glove, (v) => h.set('a11y', { ...h.a11y, glove: v }), 'Glove mode', 'Large touch targets (≥52 px), bigger text and a one-handed quick bar', 'm-glove')}
      {row(h.a11y.contrast, (v) => h.set('a11y', { ...h.a11y, contrast: v }), 'High contrast', 'Pure black, white text, solid borders, underlined links', 'm-contrast')}
      {row(h.a11y.reduce, (v) => h.set('a11y', { ...h.a11y, reduce: v }), 'Reduced motion', 'Turns off animation (also follows your OS setting)', 'm-reduce')}
      {row(h.earthMode, (v) => h.set('earthMode', v), 'Earth Mode', 'Same engine for remote clinics, Antarctic stations and outback care: terms switch to patient / remote specialist', 'm-earth')}
      <div className="mt-2 rounded-xl bg-white/[0.03] p-2 text-xs text-ink-mute"><Gauge size={12} className="mr-1 inline" aria-hidden />Status is always shown with an icon and a word, never colour alone.</div>
    </div>
  )
}

/** One-handed quick bar for glove mode: the four actions you need in a hurry, within thumb reach. */
function GloveBar() {
  const h = useHalo()
  const items: { label: string; Icon: typeof Activity; go: ViewId }[] = [
    { label: 'Log', Icon: PencilLine, go: 'log' }, { label: 'Triage', Icon: Stethoscope, go: 'triage' }, { label: 'Shelter', Icon: Zap, go: 'radiation' }, { label: 'Home', Icon: LayoutDashboard, go: 'console' },
  ]
  return (
    <nav aria-label="Quick actions" className="no-print fixed bottom-24 right-4 z-40 flex flex-col gap-2 lg:bottom-6" data-glovebar>
      {items.map((it) => (
        <button key={it.label} onClick={() => h.go(it.go)} className="btn-primary h-16 w-16 flex-col gap-0.5 rounded-2xl text-[11px] shadow-xl" aria-label={it.label}><it.Icon size={20} aria-hidden />{it.label}</button>
      ))}
    </nav>
  )
}

function Welcome() {
  const h = useHalo()
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const close = () => h.set('welcomed', true)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) })
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title" data-welcome>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="panel-raised relative w-full max-w-xl overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-ice/10 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3"><OrbitalMark size={52} small title="Orbital Vitals logo" /><div><div className="text-lg font-bold tracking-[0.2em]">HALO</div><div className="text-xs text-ink-mute">Health Autonomy Loop for Orbit · by Orbital Vitals</div></div></div>
          <div className="label">NASA Space Apps 2026 · Health monitoring for astronauts</div>
          <h1 id="welcome-title" className="mt-2 text-[28px] font-semibold leading-tight tracking-tight md:text-[34px]">When Earth is 20 minutes away, HALO is the crew’s health copilot.</h1>
          <p className="mt-3 text-sm text-ink-soft">Personal baselines, early drift detection, NASA’s five hazards, offline triage, and real NASA space-weather data. Crew data is simulated.</p>
          <div className="mt-6 grid gap-2.5">
            <button ref={ref} className="btn-primary justify-start py-3 text-base" onClick={() => { close(); h.storyFrom(1) }} data-welcome-story><Play size={18} aria-hidden /> Watch the 60-second story <span className="ml-auto text-xs opacity-70">Day 1 → 180</span></button>
            <button className="btn-ghost justify-start py-3 text-base" onClick={() => { close(); h.setDay(SPE_DAY); h.go('radiation') }} data-welcome-storm><Zap size={18} className="text-warn" aria-hidden /> Jump to the solar storm <span className="ml-auto text-xs text-ink-mute">Day 90 · real NASA data</span></button>
            <button className="btn-ghost justify-start py-3 text-base" onClick={() => { close(); h.setJudge(true) }} data-welcome-judge><Sparkles size={18} className="text-teal" aria-hidden /> Judge tour <span className="ml-auto text-xs text-ink-mute">12 steps · keyboard</span></button>
          </div>
          <button className="mt-4 text-sm text-ink-mute underline-offset-4 hover:text-ink hover:underline" onClick={close} data-welcome-close>Explore on my own</button>
        </div>
      </motion.div>
    </div>
  )
}

function Toast() {
  const { toast } = useHalo()
  const col = toast?.tone === 'alert' ? '#F43F5E' : toast?.tone === 'warn' ? '#F59E0B' : toast?.tone === 'ok' ? '#34D399' : '#60A5FA'
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 lg:inset-x-auto lg:bottom-6 lg:right-6" aria-live="polite" role="status">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="pointer-events-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-l-4 bg-[#141D31] px-4 py-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]" style={{ borderColor: col + '66', borderLeftColor: col }}>
            <div className="text-sm font-semibold" style={{ color: col }}>{toast.title}</div>
            <div className="mt-0.5 text-[13px] text-ink-soft">{toast.body}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PageHeader({ item, label }: { item: NavItem; label: (n: NavItem) => string }) {
  const h = useHalo()
  const sec = NAV.filter((n) => n.group === item.group)
  const g = GROUPS[item.group]
  return (
    <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3" data-page-header>
      <div className="flex min-w-0 items-center gap-3">
        <span className="hero-icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><item.Icon size={20} aria-hidden /></span>
        <div className="min-w-0">
          <div className="label flex items-center gap-1.5"><span className="num text-teal">{g.n}</span><span>{item.group}</span><span className="text-ink-mute/60">·</span><span className="normal-case tracking-normal">{g.text}</span></div>
          <h1 className="text-xl font-semibold tracking-tight text-ink md:text-[22px]">{label(item)}</h1>
          <p className="text-[13px] text-ink-soft">{item.blurb}</p>
        </div>
      </div>
      <div className="ml-auto hidden flex-wrap gap-1 md:flex" role="navigation" aria-label={`${item.group} pages`}>
        {sec.map((n) => (
          <button key={n.id} onClick={() => h.go(n.id)} aria-current={n.id === item.id ? 'page' : undefined}
            className={`focus-ring tap rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${n.id === item.id ? 'border-teal/40 bg-teal/10 text-teal' : 'border-white/10 text-ink-mute hover:border-white/20 hover:text-ink'}`}>{label(n)}</button>
        ))}
      </div>
    </div>
  )
}
