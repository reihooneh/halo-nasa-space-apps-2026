import { useState } from 'react'
import { Building2, Globe2, Mountain, Snowflake } from 'lucide-react'
import { useHalo } from '../state/store'
import { Panel, Prov, StatePill, Illustrative } from '../ui/kit'
import { IndicatorChart } from '../ui/charts'
import { FACTS } from '../data/sources'

const PRESETS = [
  { id: 'antarctic', Icon: Snowflake, name: 'Antarctic research station', access: 'Specialist care can be months away in winter', who: 'Expeditioners in isolated, confined, extreme (ICE) conditions, the same analog NASA studies for spaceflight.', delay: 'months' },
  { id: 'outback', Icon: Mountain, name: 'Remote & outback communities', access: 'Specialist review can be hours to days away', who: 'Patients managed by remote clinics and visiting or telehealth services.', delay: 'hours–days' },
  { id: 'clinic', Icon: Building2, name: 'Under-resourced clinics worldwide', access: 'Limited specialists, intermittent connectivity', who: 'Community health workers who need simple, explainable triage that works offline.', delay: 'intermittent' },
]

export function EarthView() {
  const h = useHalo()
  const [p, setP] = useState(PRESETS[0].id)
  const pr = PRESETS.find((x) => x.id === p)!
  return (
    <div className="space-y-5">
      <Panel title="Earth Mode" kicker="Same engine · same explanations · different place" tour="earth" right={<Prov ids={['csaWhy']} />}>
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.06] p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium" htmlFor="earthToggle"><input id="earthToggle" type="checkbox" className="h-5 w-5 accent-[#2DD4BF]" checked={h.earthMode} onChange={(e) => h.set('earthMode', e.target.checked)} /> Earth Mode across the whole app</label>
          <span className="text-xs text-ink-soft">{h.earthMode ? 'On: “flight surgeon” → “remote specialist”, “astronaut” → “patient”, “Ground Link” → “Specialist Link”.' : 'Turn on to relabel every screen for remote care on Earth.'}</span>
        </div>
        <p className="max-w-3xl text-sm text-ink-soft">HALO was built for when the specialist is far away and the connection is slow. That is also everyday life for many people on Earth. Earth Mode keeps the personal-baseline drift engine, the offline triage and the store-and-forward packet, and relabels “flight surgeon” as “remote specialist”.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PRESETS.map((x) => (
            <button key={x.id} onClick={() => setP(x.id)} aria-pressed={p === x.id} className={`focus-ring rounded-2xl border p-4 text-left transition-colors ${p === x.id ? 'border-teal/50 bg-teal/[0.06]' : 'border-white/[0.08] hover:bg-white/[0.03]'}`}>
              <x.Icon size={20} className="text-teal" aria-hidden />
              <div className="mt-2 font-medium">{x.name}</div>
              <div className="mt-1 text-xs text-ink-soft">{x.access}</div>
            </button>
          ))}
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={`${pr.name}: personal drift, not population averages`} kicker="Simulated patient · same engine" right={<StatePill state={h.states.sleep} />}>
          <IndicatorChart res={h.analysis.leila.sleep} ind="sleep" day={Math.max(h.day, 60)} window={60} height={220} />
          <div className="mt-2 text-sm text-ink-soft">Who it helps: {pr.who} Time to specialist: <b className="text-ink">{pr.delay}</b>. HALO switches to autonomous protocol and queues a summary for when the link returns.</div>
          <div className="mt-2"><Illustrative text="Simulated data · not a medical device" /></div>
        </Panel>
        <Panel title="Why space research helps people here" kicker="CSA · official challenge resource" right={<Globe2 size={16} className="text-teal" />}>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>Weightlessness affects the body in ways similar to accelerated ageing and a sedentary lifestyle.</li>
            <li>Canadian space studies of bones, heart, vessels and brain inform balance problems in seniors, osteoporosis, cardiovascular disorders and Type 2 diabetes.</li>
            <li>Radiation monitoring built for space supports cancer therapy, aircrew protection and public safety on Earth.</li>
          </ul>
          <div className="mt-3"><Prov ids={['csaWhy', 'csaRadiation']} /></div>
          <div className="mt-3 rounded-xl border border-white/[0.07] p-3 text-xs text-ink-soft"><b className="text-ink">Local impact (Sydney → Australia):</b> remote and outback communities and Australian Antarctic stations face the same problem HALO solves: the expert is far away. <span className="text-ink-mute">({FACTS.thresholds.value})</span></div>
        </Panel>
      </div>
    </div>
  )
}
