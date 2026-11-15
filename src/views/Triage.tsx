import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Minus, PackageCheck, Plus, Send } from 'lucide-react'
import { IND } from '../data/domain'
import { useHalo } from '../state/store'
import { TRIAGE_THRESHOLDS } from '../engine/triage'
import { Illustrative, LevelPill, Panel, ReadAloud, Simulated } from '../ui/kit'

export function TriageView() {
  const h = useHalo()
  const t = h.triage
  const [done, setDone] = useState<Record<string, boolean>>({})
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Autonomous Triage" kicker="Deterministic · offline · explainable" tour="triage" right={<><Simulated /><Illustrative text="Rules illustrative" /></>}>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div><div className="label">Decision</div><div className="mt-1"><LevelPill level={t.level} big /></div></div>
            <div className="min-w-0 flex-1 text-sm text-ink-soft">{t.groundNote}</div>
            {t.hits.length > 0 && <ReadAloud label="Read protocol aloud" lines={[`Triage decision: ${t.level === 'self' ? 'self-manage' : t.level}.`, ...t.hits.flatMap((r) => [r.title + '.', ...r.steps.map((s, k) => `Step ${k + 1}. ${s.text}`)])]} />}
            {t.contactGround && <button className="btn-danger" onClick={() => { h.sendGround(`URGENT D${h.day}: ${t.hits.filter((x) => x.level === 'urgent').map((x) => x.title).join('; ')}`, 'packet'); h.pushToast('Urgent packet queued', 'Contacting flight surgeon. HALO continues the protocol meanwhile.', 'alert') }}><Send size={15} aria-hidden /> Contact {h.t('surgeon')} now</button>}
          </div>
          {t.supplyWarnings.length > 0 && (
            <div className="mt-3 rounded-xl border border-warn/40 bg-warn/[0.07] p-3 text-sm" role="alert">
              <div className="mb-1 flex items-center gap-2 font-medium text-warn"><AlertTriangle size={15} aria-hidden /> Medkit warnings</div>
              <ul className="list-disc pl-5 text-ink-soft">{t.supplyWarnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          {t.hits.length === 0 && <div className="mt-4 rounded-xl border border-ok/25 bg-ok/[0.06] p-4 text-sm text-ok"><CheckCircle2 size={16} className="mr-2 inline" aria-hidden />No rules triggered. Self-manage: keep the routine.</div>}
          <ol className="mt-4 space-y-3">
            {t.hits.map((r) => (
              <li key={r.id} className="rounded-2xl border border-white/[0.08] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><span className="num rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-mute">{r.id}</span><span className="font-medium">{r.title}</span></div>
                  <LevelPill level={r.level} />
                </div>
                <div className="mt-1.5 text-sm text-ink-soft"><b className="text-ink">Why:</b> {r.why}</div>
                {r.indicators.length > 0 && <div className="mt-1 text-xs text-ink-mute">Inputs: {r.indicators.map((i) => `${IND[i].short} ${h.latest[i] ?? '—'} ${IND[i].unit} (${h.states[i]})`).join(' · ')}</div>}
                <ol className="mt-3 space-y-1.5">
                  {r.steps.map((s, k) => {
                    const key = `${h.day}:${r.id}:${k}`
                    const item = s.item ? h.medkit.find((m) => m.id === s.item) : null
                    return (
                      <li key={k}>
                        <button onClick={() => { setDone((d) => ({ ...d, [key]: !d[key] })); if (!done[key]) h.addAction(`${r.id} step ${k + 1}: ${s.text}`) }} aria-pressed={!!done[key]}
                          className="focus-ring tap flex w-full items-start gap-2 rounded-xl border border-white/[0.06] px-3 py-2 text-left text-sm hover:bg-white/[0.03]">
                          <span className={`num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${done[key] ? 'bg-ok text-space-950' : 'bg-white/10 text-ink-soft'}`}>{done[key] ? '✓' : k + 1}</span>
                          <span className={done[key] ? 'text-ink-mute line-through' : ''}>{s.text}</span>
                          {item && <span className={`ml-auto shrink-0 chip px-2 py-0.5 text-[10px] ${item.qty <= 0 ? 'border-alert/40 text-alert' : item.scarceAt > 0 && item.qty <= item.scarceAt ? 'border-warn/40 text-warn' : 'border-white/10 text-ink-mute'}`}><PackageCheck size={10} />{item.qty} left</span>}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-5">
          <Panel title="Decision tree" kicker="Evaluated top to bottom, highest level wins">
            <ol className="space-y-1.5 text-xs">
              {[
                ['R1', 'Solar particle event active → Urgent (shelter). Watch → Monitor.'],
                ['R2', `Temp ≥ ${TRIAGE_THRESHOLDS.feverC} °C + HR raised → Urgent; temp alone → Monitor.`],
                ['R3', `BP ≥ ${TRIAGE_THRESHOLDS.sbpHigh}/${TRIAGE_THRESHOLDS.dbpHigh} or ≤ ${TRIAGE_THRESHOLDS.sbpLow} with HR ≥ ${TRIAGE_THRESHOLDS.hrHighWithLowBp} → Urgent; BP drift → Monitor.`],
                ['R4', `Glucose ≤ ${TRIAGE_THRESHOLDS.glucoseLow} or ≥ ${TRIAGE_THRESHOLDS.glucoseHigh} mg/dL → Urgent; drift → Monitor.`],
                ['R5', 'Mood 1/5 → Urgent (talk to a human); mood drift → Monitor.'],
                ['R6–R7', 'Sleep or reaction-time drift → Monitor (defer critical tasks).'],
                ['R8', 'Exercise drift → Self-manage (Gravity Debt plan).'],
                ['Ground', `Urgent → contact ground. If one-way delay ≥ ${TRIAGE_THRESHOLDS.autonomousDelaySec / 60} min, HALO runs the protocol first.`],
              ].map(([k, v]) => <li key={k} className="flex gap-2 rounded-lg border border-white/[0.05] px-2 py-1.5"><span className="num w-12 shrink-0 text-teal">{k}</span><span className="text-ink-soft">{v}</span></li>)}
            </ol>
            <div className="mt-2"><Illustrative /></div>
          </Panel>
          <Medkit />
        </div>
      </div>
    </div>
  )
}

function Medkit() {
  const h = useHalo()
  const adj = (id: string, d: number) => h.set('medkit', h.medkit.map((m) => (m.id === id ? { ...m, qty: Math.max(0, m.qty + d) } : m)))
  return (
    <Panel title="Onboard medkit" kicker="Triage only recommends what you have" tour="medkit" right={<Illustrative text="Simulated inventory" />}>
      <ul className="space-y-1.5">
        {h.medkit.map((m) => {
          const low = m.qty <= 0 ? 'empty' : m.scarceAt > 0 && m.qty <= m.scarceAt ? 'low' : null
          return (
            <li key={m.id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate" title={m.note || m.name}>{m.name}</span>
              {low && <span className={`chip px-2 py-0.5 text-[10px] ${low === 'empty' ? 'border-alert/40 text-alert' : 'border-warn/40 text-warn'}`}>{low === 'empty' ? 'Empty' : 'Low'}</span>}
              <button className="btn-ghost px-1.5 py-1" onClick={() => adj(m.id, -1)} aria-label={`Use one ${m.name}`}><Minus size={13} /></button>
              <span className="num w-7 text-center">{m.qty}</span>
              <button className="btn-ghost px-1.5 py-1" onClick={() => adj(m.id, 1)} aria-label={`Add one ${m.name}`}><Plus size={13} /></button>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 text-[11px] text-ink-mute">Set an item to 0 and open a matching protocol to see the warning. HALO never gives drug doses; it points to the crew medical checklist.</div>
    </Panel>
  )
}
