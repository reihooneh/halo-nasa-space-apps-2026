import { CheckCircle2, CircleDashed, ShieldCheck, Stethoscope, XCircle } from 'lucide-react'
import { CLINICAL_TABLE, classify } from '../data/clinical'
import { FACTS } from '../data/sources'
import { IND } from '../data/domain'
import { useHalo } from '../state/store'
import { Panel, Prov, StatePill } from '../ui/kit'
import { SubHead } from './Sensors'

const NASA_DATA: { what: string; how: string; fact?: string; sources: string[] }[] = [
  { what: 'Space-weather events', how: '181 flares, 144 CMEs and 27 SEP events from the DONKI database drive the storm scenario and shelter rule.', sources: ['donki'] },
  { what: 'Radiation limits', how: 'Career and per-event limits drive the dose ledger.', fact: 'careerLimit', sources: ['radBrief'] },
  { what: 'Measured deep-space dose', how: 'Curiosity RAD measurements set the cruise dose rate and the 20 May 2024 storm dose.', fact: 'cruiseDose', sources: ['radCruise', 'marsStorm'] },
  { what: 'Astronaut sleep', how: 'ISS crews averaged 6.09 h, the benchmark next to the AASM 7 h target.', fact: 'sleepIss', sources: ['sleepStudy'] },
  { what: 'Alertness test', how: 'HALO runs NASA’s 3-minute Reaction Self-Test protocol (PVT-B).', fact: 'pvtB', sources: ['spinoffRst', 'pvtRst'] },
  { what: 'Human-system risks', how: 'Every body system, indicator and hazard maps to NASA HRP risks and the RIDGE hazards.', sources: ['hrpRisks', 'hrpHazards'] },
  { what: 'Communication delay', how: 'Delay model and autonomy modes use NASA’s Mars delay figures.', fact: 'marsDelay', sources: ['hazDistance', 'marsDelays'] },
  { what: 'Glucose in orbit', how: 'CGM validation aboard the ISS supports a glucose indicator.', fact: 'cgmIss', sources: ['axiomCgm'] },
]

export function ClinicalView() {
  const h = useHalo()
  const live = (['sbp', 'hr', 'temp', 'glucose', 'sleep'] as const).map((id) => ({ id, v: h.latest[id], c: classify(id, h.latest[id], h.latest) }))
  return (
    <div className="space-y-5">
      <SubHead n="1" title="Two lenses on every reading" text="Personal drift catches change early. Published guidelines say when a value is abnormal for anyone." />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="How HALO judges a reading" kicker="Personal baseline + clinical guideline">
          <svg viewBox="0 0 560 210" className="w-full" role="img" aria-label="Diagram: a reading goes to two lenses, personal drift and clinical guideline, which combine into triage.">
            <defs>
              <linearGradient id="cg1" x1="0" x2="1"><stop offset="0" stopColor="#2DD4BF" stopOpacity=".25" /><stop offset="1" stopColor="#2DD4BF" stopOpacity=".05" /></linearGradient>
              <linearGradient id="cg2" x1="0" x2="1"><stop offset="0" stopColor="#60A5FA" stopOpacity=".25" /><stop offset="1" stopColor="#60A5FA" stopOpacity=".05" /></linearGradient>
              <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7C8AA5" /></marker>
            </defs>
            <rect x="8" y="80" width="110" height="50" rx="12" fill="#121B2E" stroke="#ffffff22" /><text x="63" y="102" textAnchor="middle" fontSize="12" fill="#E6EDF7" fontWeight="600">Reading</text><text x="63" y="118" textAnchor="middle" fontSize="10" fill="#A9B6CC">e.g. 138/86 mmHg</text>
            <path d="M118,98 C150,98 150,52 182,52" stroke="#7C8AA5" fill="none" markerEnd="url(#ar)" /><path d="M118,112 C150,112 150,158 182,158" stroke="#7C8AA5" fill="none" markerEnd="url(#ar)" />
            <rect x="184" y="22" width="190" height="60" rx="12" fill="url(#cg1)" stroke="#2DD4BF55" /><text x="279" y="45" textAnchor="middle" fontSize="12" fill="#2DD4BF" fontWeight="600">Personal drift</text><text x="279" y="62" textAnchor="middle" fontSize="10" fill="#A9B6CC">vs your own pre-flight baseline</text><text x="279" y="75" textAnchor="middle" fontSize="9.5" fill="#7C8AA5">early · “is this unusual for me?”</text>
            <rect x="184" y="128" width="190" height="60" rx="12" fill="url(#cg2)" stroke="#60A5FA55" /><text x="279" y="151" textAnchor="middle" fontSize="12" fill="#60A5FA" fontWeight="600">Clinical guideline</text><text x="279" y="168" textAnchor="middle" fontSize="10" fill="#A9B6CC">AHA · CDC · ADA · AASM · NHLBI</text><text x="279" y="181" textAnchor="middle" fontSize="9.5" fill="#7C8AA5">absolute · “abnormal for anyone?”</text>
            <path d="M374,52 C410,52 410,98 440,98" stroke="#7C8AA5" fill="none" markerEnd="url(#ar)" /><path d="M374,158 C410,158 410,112 440,112" stroke="#7C8AA5" fill="none" markerEnd="url(#ar)" />
            <rect x="442" y="76" width="110" height="58" rx="12" fill="#121B2E" stroke="#F59E0B66" /><text x="497" y="99" textAnchor="middle" fontSize="12" fill="#F59E0B" fontWeight="600">Triage</text><text x="497" y="115" textAnchor="middle" fontSize="10" fill="#A9B6CC">self · monitor · urgent</text><text x="497" y="127" textAnchor="middle" fontSize="9" fill="#7C8AA5">explainable rules</text>
          </svg>
        </Panel>
        <Panel title="Right now" kicker={`Day ${h.day} · ${h.mission.crew.find((c) => c.id === h.crewId)!.name}`}>
          <ul className="space-y-1.5">
            {live.map(({ id, v, c }) => (
              <li key={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/[0.06] px-3 py-2 text-sm" data-live-class={id}>
                <span className="w-24 shrink-0 text-ink-soft">{id === 'sbp' ? 'Blood pressure' : IND[id].short}</span>
                <span className="num w-20 shrink-0">{id === 'sbp' ? `${h.latest.sbp ?? '—'}/${h.latest.dbp ?? '—'}` : v ?? '—'}</span>
                <StatePill state={h.states[id]} small />
                <span className={`ml-auto text-right text-xs ${c?.tone === 'bad' ? 'text-alert' : c?.tone === 'warn' ? 'text-warn' : 'text-ink-soft'}`}>{c?.label ?? '—'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-mute">Left pill: drift vs this astronaut’s baseline. Right: category from the published guideline.</p>
        </Panel>
      </div>

      <SubHead n="2" title="Guideline table" text="Every absolute threshold in HALO, with the guideline it comes from." />
      <Panel title="Clinical reference" kicker="Published guidelines HALO checks against" right={<span className="chip border-ok/30 text-ok"><ShieldCheck size={12} /> All sourced</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="label border-b border-white/[0.06]"><th className="py-2 pr-3">Measure</th><th className="py-2 pr-3">Published rule</th><th className="py-2 pr-3">How HALO uses it</th><th className="py-2">Source</th></tr></thead>
            <tbody>{CLINICAL_TABLE.map((r) => (
              <tr key={r.measure} className="border-b border-white/[0.04] align-top">
                <td className="py-2.5 pr-3 font-medium">{r.measure}</td><td className="num py-2.5 pr-3 text-[12.5px] text-ink-soft">{r.rule}</td><td className="py-2.5 pr-3 text-[12.5px] text-ink-soft">{r.use}</td><td className="py-2.5"><Prov ids={r.sources} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>

      <SubHead n="3" title="NASA data inside HALO" text="Where NASA measurements and standards drive the numbers." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {NASA_DATA.map((d) => (
          <div key={d.what} className="panel tilt p-4">
            <div className="text-sm font-medium">{d.what}</div>
            {d.fact && <div className="num mt-1 text-[13px] text-teal">{FACTS[d.fact].value}</div>}
            <p className="mt-1 text-xs text-ink-soft">{d.how}</p>
            <div className="mt-2"><Prov ids={d.sources} /></div>
          </div>
        ))}
      </div>

      <SubHead n="4" title="Is HALO clinical?" text="An honest answer, so judges and crews know exactly what to trust." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Clinical-grade today" kicker="Built on published standards">
          <ul className="space-y-1.5 text-sm text-ink-soft">{['Absolute thresholds from AHA, NHLBI, CDC, ADA and AASM', 'PHQ-2: a validated depression screen', 'PVT-B scoring as flown by NASA (355 ms lapse)', 'Bland–Altman method for sensor agreement', 'NASA-STD-3001 radiation limits'].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" aria-hidden />{x}</li>)}</ul>
        </Panel>
        <Panel title="Not clinical" kicker="Stated everywhere in the app">
          <ul className="space-y-1.5 text-sm text-ink-soft">{['Crew data is simulated; the crew is fictional', 'Not cleared as a medical device; no diagnosis or drug dosing', 'Triage steps are demo protocols, not flight-surgeon approved', 'Drift parameters (z-score, persistence) are HALO design choices', 'Camera pulse is demo-grade until validated'].map((x) => <li key={x} className="flex gap-2"><XCircle size={15} className="mt-0.5 shrink-0 text-alert" aria-hidden />{x}</li>)}</ul>
        </Panel>
        <Panel title="Path to clinical" kicker="What would have to happen">
          <ul className="space-y-1.5 text-sm text-ink-soft">{['Flight-surgeon review of every protocol', 'Validate drift detection on real astronaut or analog data', 'Sensor validation across lighting and skin tones', 'Regulatory review as software that supports medical decisions'].map((x) => <li key={x} className="flex gap-2"><CircleDashed size={15} className="mt-0.5 shrink-0 text-ice" aria-hidden />{x}</li>)}</ul>
          <button className="btn-ghost mt-3 w-full text-xs" onClick={() => h.go('next')}><Stethoscope size={14} aria-hidden /> See limitations & next steps</button>
        </Panel>
      </div>
    </div>
  )
}
