import { Download, Printer, Send } from 'lucide-react'
import { ENV, INDICATORS, IND, fmtDelay } from '../data/domain'
import { useHalo } from '../state/store'
import { cumulativeDose, fmtDate, SCRIPT } from '../sim/mission'
import { LEVEL_LABEL } from '../engine/triage'
import { Panel, StatePill, download, printPage, Simulated } from '../ui/kit'

export function PacketView() {
  const h = useHalo()
  const crew = h.mission.crew.find((c) => c.id === h.crewId)!
  const rows = INDICATORS.map((i) => {
    const r = h.analysis[h.crewId][i.id][h.idx]
    return { i, r }
  })
  const flags = h.detections.filter((d) => d.crewId === h.crewId && d.personalDay <= h.day && h.day - d.personalDay <= 30)
  const events = SCRIPT.filter((s) => s.day <= h.day && h.day - s.day <= 30)
  const actions = h.actions.filter((a) => a.day <= h.day).slice(-8)
  const questions: string[] = []
  if (h.triage.level === 'urgent') questions.push('Confirm HALO protocol and advise on further treatment from the crew medical checklist.')
  if (h.states.sleep === 'drift' || h.states.pvt === 'drift') questions.push('Approve a workload reduction / sleep-protection plan for the next 3 days?')
  if (h.states.exercise === 'drift') questions.push('Adjust the exercise prescription to two shorter sessions?')
  if (h.states.mood === 'drift') questions.push('Schedule a private behavioural-health conference at the next comms window?')
  if (h.speActive || h.watchActive) questions.push('Confirm shelter duration and all-clear criteria for this space-weather event.')
  if (!questions.length) questions.push('No open questions. Routine summary.')
  const packet = {
    format: 'HALO Flight Surgeon Packet v1', simulated: true, missionDay: h.day, date: fmtDate(h.day), environment: ENV[h.env].name, oneWayDelay: fmtDelay(h.delaySec),
    crewMember: crew.name, role: crew.role, crewHealthIndex: h.chi.score, triage: LEVEL_LABEL[h.triage.level],
    indicators: rows.map(({ i, r }) => ({ indicator: i.name, unit: i.unit, value: r.value, baseline: Number(r.center.toFixed(2)), robustZ: r.z == null ? null : Number(r.z.toFixed(2)), state: r.state, slope7: r.slope7 == null ? null : Number(r.slope7.toFixed(3)) })),
    driftFlags: flags.map((f) => ({ indicator: IND[f.indicator].name, firstFlaggedDay: f.personalDay, populationRuleDay: f.populationDay })),
    triageRules: h.triage.hits.map((x) => ({ id: x.id, level: x.level, title: x.title, why: x.why })),
    actionsTaken: actions, openQuestions: questions, missionDoseMilliSv: cumulativeDose(h.mission, h.day),
    disclaimer: 'Simulated data. Not a medical device. Thresholds illustrative.',
  }
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => { h.sendGround(`Flight Surgeon Packet D${h.day} (${crew.name}): ${LEVEL_LABEL[h.triage.level]}, CHI ${h.chi.score}`, 'packet'); h.pushToast('Packet queued for downlink', `Arrives in ${fmtDelay(h.delaySec)}.`, 'ok') }}><Send size={15} aria-hidden /> Queue for downlink</button>
        <button className="btn-ghost" onClick={printPage}><Printer size={15} aria-hidden /> Print / save PDF</button>
        <button className="btn-ghost" onClick={() => download(`halo-packet-D${h.day}-${crew.id}.json`, JSON.stringify(packet, null, 2), 'application/json')}><Download size={15} aria-hidden /> JSON</button>
        <span className="text-xs text-ink-mute">Auto-generated · {(() => { const n = h.messages.filter((m) => m.kind === 'packet').length; return `${n} packet${n === 1 ? '' : 's'} queued` })()}</span>
      </div>
      <Panel className="print-area" tour="packet">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="label">HALO · {h.earthMode ? 'Remote Specialist' : 'Flight Surgeon'} Packet</div>
            <h1 className="mt-1 text-xl font-semibold">{crew.name} · {crew.role}</h1>
            <div className="mt-1 text-sm text-ink-soft">Mission day {h.day} ({fmtDate(h.day)}) · {ENV[h.env].name} · one-way delay {fmtDelay(h.delaySec)}</div>
          </div>
          <div className="text-right"><div className="label">Crew Health Index</div><div className="num text-3xl">{h.chi.score}</div><div className="text-sm">Triage: <b>{LEVEL_LABEL[h.triage.level]}</b></div><div className="mt-1"><Simulated /></div></div>
        </div>
        <h2 className="label mt-4">Status vs personal baseline</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-ink-mute"><th className="py-1.5 font-medium">Indicator</th><th className="font-medium">Today</th><th className="font-medium">Baseline</th><th className="font-medium">Robust z</th><th className="font-medium">7-day trend</th><th className="font-medium">State</th></tr></thead>
            <tbody>
              {rows.map(({ i, r }) => (
                <tr key={i.id} className="border-t border-white/[0.05]">
                  <td className="py-1.5">{i.name}</td><td className="num">{r.value ?? '—'} {i.unit}</td><td className="num">{r.center.toFixed(i.decimals + 1)}</td><td className="num">{r.z?.toFixed(2) ?? '—'}</td><td className="num">{r.slope7 == null ? '—' : `${r.slope7 > 0 ? '+' : ''}${r.slope7.toFixed(i.decimals + 2)}/d`}</td><td><StatePill state={r.state} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Section title="Drift flags (last 30 days)" items={flags.map((f) => `${IND[f.indicator].name}: flagged D${f.personalDay}${f.populationDay ? `; population rule D${f.populationDay}` : '; population rule did not flag'}`)} empty="None" />
          <Section title="Triage rules fired" items={h.triage.hits.map((x) => `${x.id} · ${LEVEL_LABEL[x.level]}: ${x.title}`)} empty="None: self-manage" />
          <Section title="Mission events (last 30 days)" items={events.map((e) => `D${e.day}: ${e.title}`)} empty="None" />
          <Section title="Actions taken" items={actions.map((a) => `D${a.day}: ${a.summary}`)} empty="No crew actions logged this session" />
        </div>
        <div className="mt-4 rounded-xl border border-ice/25 bg-ice/[0.05] p-3"><div className="label text-ice">Open questions for the {h.t('surgeon')}</div><ul className="mt-1 list-disc pl-5 text-sm">{questions.map((q) => <li key={q}>{q}</li>)}</ul></div>
        <div className="mt-3 text-sm text-ink-soft">Mission radiation dose to date: <span className="num">{cumulativeDose(h.mission, h.day)}</span> mSv (career limit 600 mSv, NASA-STD-3001).</div>
        <div className="mt-3 text-[11px] text-ink-mute">Simulated data · Not a medical device · Thresholds illustrative · Generated offline by HALO · Fictional crew</div>
      </Panel>
    </div>
  )
}

function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div><div className="label">{title}</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">{items.length ? items.map((x) => <li key={x}>{x}</li>) : <li className="list-none pl-0 text-ink-mute">{empty}</li>}</ul></div>
}
