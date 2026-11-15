import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { useHalo } from '../state/store'
import { idxOf } from '../sim/mission'
import { LevelPill, Panel, Prov, Simulated, StatePill } from '../ui/kit'
import { IND, INDICATORS } from '../data/domain'

export function CrewView() {
  const h = useHalo()
  const team = useMemo(() => {
    const out: { d: number; mood: number; sleep: number }[] = []
    for (let d = Math.max(1, h.day - 44); d <= h.day; d++) {
      const i = idxOf(d)
      const moods = h.mission.crew.map((c) => h.analysis[c.id].mood[i].value).filter((v): v is number => v != null)
      const sl = h.mission.crew.map((c) => h.analysis[c.id].sleep[i].value).filter((v): v is number => v != null)
      out.push({ d, mood: Number((moods.reduce((a, b) => a + b, 0) / Math.max(1, moods.length)).toFixed(2)), sleep: Number((sl.reduce((a, b) => a + b, 0) / Math.max(1, sl.length)).toFixed(2)) })
    }
    return out
  }, [h.day, h.mission, h.analysis])
  const all = h.mission.crew.map((c) => ({ c, d: h.derivedFor(c.id, h.day) }))
  const behavioural = all.filter((x) => ['watch', 'drift'].includes(x.d.states.mood) || ['drift'].includes(x.d.states.sleep)).length
  return (
    <div className="space-y-5">
      <Panel title="Crew Pulse" kicker="Commander view · privacy by design" tour="crew" right={<><Simulated /><span className="chip border-white/10 text-ink-mute"><Lock size={11} /> Consent-based</span></>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {all.map(({ c, d }) => {
            const share = h.consent[c.id]
            const flags = INDICATORS.filter((i) => d.states[i.id] === 'drift')
            return (
              <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/15 text-sm font-semibold text-teal">{c.initials}</div>
                  <div className="min-w-0"><div className="break-words text-sm font-medium">{c.name}</div><div className="text-xs text-ink-mute">{c.role}</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between"><span className="label">Health index</span><span className="num text-xl">{d.chi.score}</span></div>
                <div className="mt-2"><LevelPill level={d.triage.level} /></div>
                <div className="mt-3 min-h-[52px] text-xs">
                  {share ? (flags.length ? <div className="flex flex-wrap gap-1">{flags.map((f) => <span key={f.id} className="chip border-alert/30 px-2 py-0.5 text-[10.5px] text-alert">{IND[f.id].short} drift</span>)}</div> : <StatePill state="ok" small />)
                    : <span className="flex items-center gap-1.5 text-ink-mute"><EyeOff size={13} aria-hidden /> Details private. Only urgent alerts are shared.</span>}
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-soft"><input type="checkbox" className="accent-[#2DD4BF]" checked={share} onChange={(e) => h.set('consent', { ...h.consent, [c.id]: e.target.checked })} /> {c.name.split(' ')[0]} shares flags with commander</label>
              </div>
            )
          })}
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Team behavioural signal" kicker="Aggregate only · last 45 days" right={<Prov ids={['hazIsolation', 'thirdQuarter']} />}>
          <div style={{ height: 200 }} role="img" aria-label="Crew average mood over time">
            <ResponsiveContainer>
              <AreaChart data={team} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="mg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A78BFA" stopOpacity={0.5} /><stop offset="1" stopColor="#A78BFA" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="d" tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => `D${d}`} minTickGap={24} />
                <YAxis domain={[1, 5]} tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ background: '#0F1626', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [v, 'Crew mean mood']} labelFormatter={(d) => `Day ${d}`} />
                <Area dataKey="mood" stroke="#A78BFA" fill="url(#mg)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-ink-soft"><b className="text-ink">{behavioural} of {all.length}</b> crew have a mood or sleep signal today. Mid-mission lulls (the “third-quarter phenomenon”) are reported in some analog studies, not universally.</div>
        </Panel>
        <Panel title="Privacy model" kicker="Who sees what">
          <ul className="space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden />Each astronaut sees all of their own data.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden />The commander sees the health index, triage level and team aggregates; detailed flags only with consent.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden />Urgent alerts always reach the commander (safety override).</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden />Journal text never leaves the device.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
