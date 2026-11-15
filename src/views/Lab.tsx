import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FlaskConical, Play } from 'lucide-react'
import { runSimLab, SIMLAB_ASSUMPTIONS, type SimSummary } from '../engine/simlab'
import { DRIFT_PARAMS } from '../engine/drift'
import { Illustrative, Panel } from '../ui/kit'

export function LabView() {
  const [seed, setSeed] = useState(7)
  const [res, setRes] = useState<SimSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const run = (s: number) => { setBusy(true); window.setTimeout(() => { setRes(runSimLab(s)); setBusy(false) }, 30) }
  useEffect(() => { run(seed) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const A = SIMLAB_ASSUMPTIONS
  const ctrlRunsFP = res ? res.runs.filter((r) => !r.drift && r.falsePersonal > 0).length : 0
  const ctrlRunsFPpop = res ? res.runs.filter((r) => !r.drift && r.falsePopulation > 0).length : 0
  const ctrl = res ? res.runs.filter((r) => !r.drift).length : 0
  return (
    <div className="space-y-5">
      <Panel title="Mission Simulation Lab" kicker="Sensitivity under stated assumptions · not proof" tour="lab" right={<><Illustrative text="Simulated missions" /></>}>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={() => run(seed)} disabled={busy}><Play size={15} aria-hidden />{busy ? 'Running…' : `Run ${A.runs.toLocaleString()} missions`}</button>
          <label className="flex items-center gap-2 text-sm text-ink-soft">Seed <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} className="focus-ring num w-24 rounded-lg border border-white/10 bg-space-900 px-2 py-1" /></label>
          <span className="text-xs text-ink-mute">Same seed → identical results.</span>
        </div>
        {res && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat k="True declines detected · HALO" v={`${res.detectedPersonal} / ${res.driftRuns}`} sub={`${((res.detectedPersonal / res.driftRuns) * 100).toFixed(0)}%`} good />
            <Stat k="True declines detected · fixed threshold" v={`${res.detectedPopulation} / ${res.driftRuns}`} sub={`${((res.detectedPopulation / res.driftRuns) * 100).toFixed(0)}% · missed ${res.missedByPopulation} that HALO caught`} />
            <Stat k="Median lead time (both detected)" v={res.medianLead != null ? `${res.medianLead} days` : '—'} sub={`mean ${res.meanLead ?? '—'} days earlier`} good />
            <Stat k="Control missions with any false flag" v={`HALO ${ctrlRunsFP} / ${ctrl}`} sub={`fixed threshold ${ctrlRunsFPpop} / ${ctrl} · HALO ${res.falseAlarmPersonal} flag-days per 100 crew-days`} />
          </div>
        )}
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="How many days earlier HALO flagged" kicker="Missions where both methods eventually flagged">
          <div style={{ height: 240 }} role="img" aria-label="Histogram of lead time in days">
            <ResponsiveContainer>
              <BarChart data={res?.leadHistogram ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bin" tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#0F1626', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [v, 'Missions']} labelFormatter={(b) => `${b} days earlier`} />
                <Bar dataKey="count" fill="#2DD4BF" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-[11px] text-ink-mute">Negative values: the fixed threshold flagged first (rare; e.g. people with a naturally short sleep baseline).</div>
        </Panel>
        <Panel title="Assumptions (shown so you can challenge them)" kicker={<span className="flex items-center gap-1"><FlaskConical size={12} /> Model</span>}>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li>Indicator: <b className="text-ink">{A.indicator}</b>; {A.runs.toLocaleString()} synthetic people × {A.days} days + {A.preDays} pre-flight days.</li>
            <li>Personal habitual sleep ~ N({A.baselineMean.mean}, {A.baselineMean.sd}) h; daily noise SD {A.dailyNoiseSd.min}–{A.dailyNoiseSd.max} h; {A.missingRate * 100}% missing days.</li>
            <li>{A.driftShare * 100}% of missions contain a true decline starting on day {A.driftOnset[0]}–{A.driftOnset[1]}, losing {A.driftDepth[0]}–{A.driftDepth[1]} h over {A.driftLength[0]}–{A.driftLength[1]} days; the rest are controls.</li>
            <li>HALO: robust z ≥ {DRIFT_PARAMS.zWatch} for {DRIFT_PARAMS.persistDays} days vs personal baseline. Fixed rule: &lt; {A.populationThreshold} h for {A.persistence} days.</li>
            <li>First 10 flight days ignored for both methods (adaptation).</li>
          </ul>
          <div className="mt-3 rounded-xl border border-warn/30 bg-warn/[0.06] p-3 text-xs text-ink-soft">These results show how the method behaves under these assumptions. They are not clinical validation. Real crew data (e.g. NASA Standard Measures) would be needed to confirm them.</div>
        </Panel>
      </div>
    </div>
  )
}

function Stat({ k, v, sub, good }: { k: string; v: string; sub?: string; good?: boolean }) {
  return <div className={`rounded-xl border p-3 ${good ? 'border-teal/30 bg-teal/[0.05]' : 'border-white/[0.07]'}`}><div className="label">{k}</div><div className="num mt-1 text-xl">{v}</div>{sub && <div className="mt-0.5 text-[11px] text-ink-mute">{sub}</div>}</div>
}
