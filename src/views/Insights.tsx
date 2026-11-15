import { useMemo, useState } from 'react'
import { ChartFrame, readout } from '../ui/readout'
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { Dumbbell, Lightbulb, Moon, Salad, Sun } from 'lucide-react'
import { HAZ, IND, INDICATORS, type IndicatorId } from '../data/domain'
import { useHalo } from '../state/store'
import { forecast, COUPLING } from '../engine/insights'
import { dayOfIdx, idxOf } from '../sim/mission'
import { Illustrative, Panel, Prov, Seg, StatePill, lens, Simulated } from '../ui/kit'
import { IndicatorChart } from '../ui/charts'
import { FACTS } from '../data/sources'

export function InsightsView() {
  const h = useHalo()
  const flagged = INDICATORS.find((i) => h.states[i.id] === 'drift')?.id
  const [ind, setInd] = useState<IndicatorId>(flagged ?? 'sleep')
  const [sleepPlus, setSleep] = useState(0.75)
  const [exPlus, setEx] = useState(30)
  const [adh, setAdh] = useState(1)
  const res = h.analysis[h.crewId][ind]
  const f = useMemo(() => forecast(res, h.idx, ind, 7, { sleepHours: sleepPlus, exerciseMin: exPlus, adherence: adh }), [res, h.idx, ind, sleepPlus, exPlus, adh])
  const meta = IND[ind]
  const data = f.points.map((p) => ({ ...p, d: dayOfIdx(p.day), band: p.lo != null ? [p.lo, p.hi] : undefined }))
  const endBase = f.points.at(-1)?.base, endCm = f.points.at(-1)?.cm
  return (
    <div className="space-y-5">
      <Panel title="Drift explorer" kicker="Personal baseline vs fixed guideline threshold" right={<><Simulated /><Illustrative /></>}>
        <div className="flex flex-wrap gap-2">
          {INDICATORS.map((i) => (
            <button key={i.id} onClick={() => setInd(i.id)} aria-pressed={ind === i.id} className={`focus-ring chip ${ind === i.id ? 'border-teal/50 bg-teal/10 text-teal' : 'border-white/10 text-ink-soft'} ${lens(h.hazard, i.hazards)}`}>{i.short}<StateDot s={h.states[i.id]} /></button>
          ))}
        </div>
        <div className="mt-3"><IndicatorChart res={res} ind={ind} day={h.day} window={90} height={260} markers={h.detections.filter((d) => d.crewId === h.crewId && d.indicator === ind).map((d) => ({ day: d.personalDay, label: 'HALO flag', color: '#F59E0B' }))} /></div>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-mute">
          <span><span className="mr-1 inline-block h-2 w-4 rounded-sm bg-teal/30 align-middle" />personal range (±2 robust SD)</span>
          <span><span className="mr-1 inline-block w-4 border-t border-dashed border-teal align-middle" />personal baseline</span>
          <span><span className="mr-1 inline-block w-4 border-t border-dotted border-ink-soft align-middle" />guideline threshold</span>
          <span>△ drift · ○ watch</span>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={`7-day forecast: ${meta.name}`} kicker="If nothing changes vs. if you follow the countermeasure" tour="forecast" right={<Illustrative text="Illustrative model" />}>
          <ChartFrame height={260} label="Forecast chart with uncertainty band">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => `D${d}`} />
                <YAxis tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} />
                {readout((d, p) => { const r = p[0]?.payload ?? {}; const f = (x: unknown) => (x == null ? null : Array.isArray(x) ? `${x[0]}–${x[1]}` : String(x)); return [`Day ${d}`, f(r.actual) && `measured ${f(r.actual)}`, f(r.base) && `if nothing changes ${f(r.base)}`, f(r.cm) && `with countermeasure ${f(r.cm)}`, f(r.band) && `95% band ${f(r.band)}`].filter(Boolean).join(' · ') })}
                <ReferenceLine x={h.day} stroke="#A9B6CC" strokeOpacity={0.4} label={{ value: 'today', fill: '#7D8BA5', fontSize: 10, position: 'top' }} />
                <Area dataKey="band" stroke="none" fill="#F59E0B" fillOpacity={0.12} isAnimationActive={false} />
                <Line dataKey="center" stroke="#2DD4BF" strokeOpacity={0.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                <Line dataKey="actual" stroke="#E6EDF7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                <Line dataKey="base" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                <Line dataKey="cm" stroke="#34D399" strokeWidth={2.2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-warn/25 bg-warn/[0.06] p-3"><div className="label text-warn">If nothing changes · D{h.day + 7}</div><div className="num mt-1 text-lg">{endBase ?? '—'} {meta.unit}</div></div>
            <div className="rounded-xl border border-ok/25 bg-ok/[0.06] p-3"><div className="label text-ok">With countermeasure · D{h.day + 7}</div><div className="num mt-1 text-lg">{endCm ?? '—'} {meta.unit}</div></div>
          </div>
          <p className="mt-2 text-[11px] text-ink-mute">Model: linear trend of the last 14 days with a 95% band from residual scatter; countermeasure path returns toward the personal baseline (4-day time constant), plus what-if shifts. Coupling: +1 h sleep → {COUPLING.sleepToPvt} ms reaction, +{COUPLING.sleepToMood} mood. All coefficients illustrative.</p>
        </Panel>

        <Panel title="What-if" kicker="Time machine + sliders" tour="whatif">
          <Slider label="Extra sleep per night" value={sleepPlus} min={0} max={2} step={0.25} unit="h" onChange={setSleep} />
          <Slider label="Extra exercise per day" value={exPlus} min={0} max={90} step={15} unit="min" onChange={setEx} />
          <Slider label="Countermeasure adherence" value={adh} min={0.25} max={1.5} step={0.25} unit="×" onChange={setAdh} />
          <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-ink-soft">Scrub the mission-day slider at the top to see HALO’s state and advice on any past day. The forecast re-runs instantly.</div>
          <GravityDebt />
        </Panel>
      </div>
      <Countermeasures />
    </div>
  )
}

function StateDot({ s }: { s: string }) {
  const c = s === 'drift' ? '#F43F5E' : s === 'watch' ? '#F59E0B' : s === 'adapt' ? '#60A5FA' : s === 'nodata' ? '#7D8BA5' : '#34D399'
  return <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} aria-hidden />
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  const id = label.replace(/\s/g, '')
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm"><label htmlFor={id} className="text-ink-soft">{label}</label><span className="num text-ink">{unit === '×' ? `${value}×` : `+${value} ${unit}`}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#2DD4BF]" />
    </div>
  )
}

/** F32: Gravity Debt meter: cumulative exercise shortfall over 30 days vs. the crew member's own plan (illustrative). */
function GravityDebt() {
  const h = useHalo()
  const res = h.analysis[h.crewId].exercise
  const plan = res[h.idx].center
  let debt = 0
  for (let i = Math.max(idxOf(1), h.idx - 29); i <= h.idx; i++) { const v = res[i].value; if (v != null) debt += Math.max(0, plan - v) }
  const hrs = debt / 60
  const pct = Math.min(100, (hrs / 20) * 100)
  return (
    <div className="mt-2 rounded-xl border border-white/[0.07] p-3" data-tour="gravity-debt">
      <div className="flex items-center justify-between"><div className="label">Gravity debt · last 30 days</div><Illustrative text="Illustrative" /></div>
      <div className="num mt-1 text-lg">{hrs.toFixed(1)} h <span className="text-xs text-ink-mute">below your exercise plan</span></div>
      <div className="mt-2 h-2 rounded-full bg-white/10" aria-hidden><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 50 ? '#F43F5E' : pct > 20 ? '#F59E0B' : '#34D399' }} /></div>
      <div className="mt-1.5 text-[11px] text-ink-mute">{FACTS.boneLoss.label}: {FACTS.boneLoss.value}. Exercise is the main countermeasure. <Prov ids={['hazGravity', 'exerciseNtrs']} /></div>
    </div>
  )
}

/** F17: personalised countermeasure planner, auto-adjusting to drift. */
function Countermeasures() {
  const h = useHalo()
  const s = h.states
  const plan = [
    { id: 'sleep', Icon: Moon, title: 'Sleep', on: s.sleep === 'drift' || s.sleep === 'watch' || s.pvt === 'drift', hz: ['isolation', 'hostile'] as const,
      items: ['Fixed 8 h sleep window tonight', 'Screens dimmed 60 min before sleep', 'Eye mask + earplugs', 'Ask commander to protect tomorrow morning'], src: ['hazIsolation', 'sleepStudy'] },
    { id: 'light', Icon: Sun, title: 'Light', on: s.sleep !== 'ok' || s.mood !== 'ok', hz: ['isolation'] as const,
      items: ['Bright / blue-enriched light within 1 h of waking', 'Dim, warm light 2 h before sleep', 'Keep light timing consistent across shifts'], src: ['hazIsolation'] },
    { id: 'exercise', Icon: Dumbbell, title: 'Exercise', on: s.exercise !== 'ok', hz: ['gravity'] as const,
      items: ['Resistance session first (bone loading)', 'Split into two shorter sessions if tired', `Plan reference: ${FACTS.exerciseIss.value} (historical ISS)`], src: ['exerciseNtrs', 'boneBrief'] },
    { id: 'nutrition', Icon: Salad, title: 'Nutrition & hydration', on: s.glucose !== 'ok' || s.temp !== 'ok' || s.exercise !== 'ok', hz: ['gravity', 'distance'] as const,
      items: ['Hydrate steadily (kidney-stone risk with bone loss)', 'Rotate menu to avoid menu fatigue', 'Re-check glucose fasting tomorrow'], src: ['hazGravity', 'hazDistance'] },
  ]
  return (
    <Panel title="Countermeasure planner" kicker="Auto-adjusts to today’s drift" tour="planner" right={<Illustrative />}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plan.map((p) => (
          <div key={p.id} className={`rounded-2xl border p-4 ${p.on ? 'border-teal/40 bg-teal/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'} ${lens(h.hazard, [...p.hz])}`}>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold"><p.Icon size={16} className="text-teal" aria-hidden />{p.title}</span>{p.on ? <span className="chip border-teal/40 text-teal"><Lightbulb size={11} />Priority today</span> : <StatePill state="ok" small />}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="mt-2 flex flex-wrap gap-1">{p.hz.map((x) => <span key={x} className="text-[10px]" style={{ color: HAZ[x].color }}>{HAZ[x].letter}·{HAZ[x].short}</span>)}</div>
            <div className="mt-2"><Prov ids={p.src} /></div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
