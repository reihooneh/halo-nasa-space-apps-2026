import { ArrowRight, CheckCircle2, CircleDashed, TriangleAlert } from 'lucide-react'
import { useHalo, type ViewId } from '../state/store'
import { Panel } from '../ui/kit'
import { SubHead } from './Sensors'

const SHIPPED: { t: string; d: string; view?: ViewId }[] = [
  { t: 'Clinical reference layer', d: 'Absolute thresholds now come from AHA, NHLBI, CDC, ADA and AASM, each cited; PHQ-2 and PVT-B scoring added.', view: 'clinical' },
  { t: 'Voice commands', d: '“Log heart rate 62”, “open radiation”, “shelter”, “play story”. Uses on-device speech recognition where the browser has it, with a typed fallback.' },
  { t: 'Mars-sol circadian planner', d: 'Sleep and light plan on the 24 h 39 min 35 s sol, drawn on the Earth clock.', view: 'sol' },
  { t: 'Sensor validation', d: 'Bland–Altman agreement between camera pulse and chest strap, judged against the ANSI ±5 bpm / ±10% band.', view: 'sensors' },
  { t: 'Installable offline app (PWA)', d: 'Install from the browser; works with no network after the first visit.' },
  { t: '3D mission view', d: 'Interactive Earth–Mars transfer with the spacecraft placed on the current mission day.', view: 'radiation' },
]
const LIMITS = [
  'Crew data is simulated and the crew is fictional, so detection performance is shown only under stated assumptions (Simulation Lab).',
  'Triage steps are demonstration protocols. Real protocols must come from flight surgeons and the crew medical checklist.',
  'Drift parameters (z-score, persistence, adaptation window) are design choices that need tuning on real data.',
  'The camera pulse estimate is demo-grade; skin tone, lighting and motion have not been tested.',
  'Space-weather events are real DONKI records placed on a scenario calendar, not live alerts.',
]
const NEXT = [
  ['Validate on real data', 'Run the drift engine on NASA analog data (HERA, CHAPEA) or Standard Measures with research partners, and report sensitivity and false alarms.'],
  ['Clinical review', 'Flight-surgeon review of every rule and step; replace demo protocols with approved ones.'],
  ['Regulatory path', 'Treat HALO as software that supports medical decisions and follow the matching review process before any operational use.'],
]

export function NextView() {
  const h = useHalo()
  return (
    <div className="space-y-5">
      <SubHead n="1" title="Roadmap items now built" text="Everything on the earlier roadmap that can be done in a hackathon is now in the app." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SHIPPED.map((s) => (
          <div key={s.t} className="panel tilt flex flex-col p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={16} className="text-ok" aria-hidden />{s.t}</div>
            <p className="mt-1 flex-1 text-xs text-ink-soft">{s.d}</p>
            {s.view && <button className="btn-ghost mt-3 self-start px-2.5 py-1 text-xs" onClick={() => h.go(s.view!)}>Open <ArrowRight size={13} aria-hidden /></button>}
          </div>
        ))}
      </div>
      <SubHead n="2" title="Known limitations" text="What HALO cannot claim yet. Saying it plainly is part of the safety case." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Limitations" kicker="Read before trusting a number">
          <ul className="space-y-2">{LIMITS.map((l) => <li key={l} className="flex gap-2 text-sm text-ink-soft"><TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" aria-hidden />{l}</li>)}</ul>
        </Panel>
        <Panel title="Next steps" kicker="Need partners, data or review, not more code">
          <ul className="space-y-2">{NEXT.map(([t, d]) => <li key={t} className="flex gap-2 rounded-xl border border-white/[0.06] p-3"><CircleDashed size={15} className="mt-0.5 shrink-0 text-ice" aria-hidden /><div><div className="text-sm font-medium">{t}</div><div className="text-xs text-ink-soft">{d}</div></div></li>)}</ul>
        </Panel>
      </div>
    </div>
  )
}
