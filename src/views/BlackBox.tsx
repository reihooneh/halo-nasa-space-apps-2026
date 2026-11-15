import { useMemo, useState } from 'react'
import { Download, Fingerprint, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { IND, INDICATORS } from '../data/domain'
import { useHalo } from '../state/store'
import { chain, verify, type BBEntryBase, type BBEntry } from '../engine/blackbox'
import { idxOf, SCRIPT } from '../sim/mission'
import { runTriage } from '../engine/triage'
import { ENV } from '../data/domain'
import { LEVEL_LABEL } from '../engine/triage'
import { Panel, download } from '../ui/kit'

export function BlackBoxView() {
  const h = useHalo()
  const [q, setQ] = useState('')
  const [tampered, setTampered] = useState<BBEntry[] | null>(null)
  const entries = useMemo(() => {
    const base: BBEntryBase[] = []
    let prevLevel = ''
    for (let d = 1; d <= h.day; d++) {
      const i = idxOf(d)
      const vals: Record<string, number | null> = {}
      const states: Record<string, string> = {}
      for (const ind of INDICATORS) { vals[ind.id] = h.analysis[h.crewId][ind.id][i].value; states[ind.id] = h.analysis[h.crewId][ind.id][i].state }
      base.push({ day: d, type: 'reading', crewId: h.crewId, summary: `Daily readings: ${INDICATORS.map((x) => `${x.short} ${vals[x.id] ?? '—'}`).join(', ')}`, data: vals })
      for (const s of SCRIPT.filter((x) => x.day === d)) base.push({ day: d, type: s.kind === 'spe' ? 'shelter' : s.kind === 'spaceweather' ? 'spaceweather' : 'action', crewId: h.crewId, summary: s.title, data: s.donki ? { donki: s.donki } : undefined })
      for (const det of h.detections.filter((x) => x.crewId === h.crewId && x.personalDay === d)) base.push({ day: d, type: 'flag', crewId: h.crewId, summary: `Drift flag: ${IND[det.indicator].name} (robust z ≥ 2 for 3 days vs personal baseline)`, data: { ...det } })
      const st = Object.fromEntries(INDICATORS.map((x) => [x.id, h.analysis[h.crewId][x.id][i].state])) as any
      const t = runTriage({ latest: vals as any, states: st, speActive: d === 90, watchActive: d >= 84 && d < 90, delaySec: ENV[h.env].delayAt(d), medkit: h.medkit })
      if (t.level !== prevLevel) { base.push({ day: d, type: 'triage', crewId: h.crewId, summary: `Triage → ${LEVEL_LABEL[t.level]}${t.hits[0] ? ` (${t.hits.map((x) => x.id).join(', ')})` : ''}`, data: { rules: t.hits.map((x) => x.id), autonomous: t.autonomous } }); prevLevel = t.level }
      for (const a of h.actions.filter((x) => x.day === d)) base.push({ day: d, type: 'user', crewId: h.crewId, summary: a.summary })
    }
    return chain(base)
  }, [h.day, h.crewId, h.analysis, h.detections, h.actions, h.env, h.medkit])
  const shown = tampered ?? entries
  const v = useMemo(() => verify(shown), [shown])
  const filtered = shown.filter((e) => e.type !== 'reading' || q).filter((e) => !q || e.summary.toLowerCase().includes(q.toLowerCase()) || e.type.includes(q.toLowerCase())).slice(-120).reverse()
  return (
    <div className="space-y-5">
      <Panel title="Health Black Box" kicker="Tamper-evident record · SHA-256 hash chain" tour="blackbox"
        right={<span className={`chip ${v.ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-alert/50 bg-alert/10 text-alert'}`}>{v.ok ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}{v.ok ? `Chain intact · ${v.checked} entries` : `Chain broken at entry #${v.brokenAt}`}</span>}>
        <p className="text-sm text-ink-soft">Every reading, flag, rule decision and action is chained: each entry’s hash includes the previous one, so editing any past entry breaks every link after it. Ground can verify the record independently.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-ink-mute" aria-hidden /><label htmlFor="bbq" className="sr-only">Search the black box</label><input id="bbq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (e.g. sleep, triage, shelter)…" className="focus-ring w-72 rounded-xl border border-white/10 bg-space-900 py-2 pl-8 pr-3 text-sm" /></div>
          <button className="btn-ghost" onClick={() => download(`halo-blackbox-${h.crewId}-D${h.day}.json`, JSON.stringify(shown, null, 2), 'application/json')}><Download size={15} aria-hidden /> Export for ground review</button>
          {!tampered ? (
            <button className="btn-ghost" onClick={() => { const t = entries.map((e) => ({ ...e })); const k = t.findIndex((e) => e.type === 'flag'); const at = k >= 0 ? k : Math.floor(t.length / 2); t[at] = { ...t[at], summary: t[at].summary + ' [edited]' }; setTampered(t) }}><Fingerprint size={15} aria-hidden /> Tamper test: edit one past entry</button>
          ) : <button className="btn-primary" onClick={() => setTampered(null)}>Restore original</button>}
        </div>
        <div className="mt-2 text-[11px] text-ink-mute">Daily reading bundles are hidden unless you search. Click an entry to replay that day.</div>
      </Panel>
      <Panel>
        <ol className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1 scroll-thin">
          {filtered.map((e) => {
            const broken = !v.ok && v.brokenAt != null && e.seq >= v.brokenAt
            return (
              <li key={e.seq}>
                <button onClick={() => h.setDay(e.day)} className={`focus-ring w-full rounded-xl border px-3 py-2 text-left hover:bg-white/[0.03] ${broken ? 'border-alert/40 bg-alert/[0.05]' : 'border-white/[0.06]'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs"><span className="num text-ink-mute">#{e.seq}</span><span className="num text-ink-mute">D{e.day}</span><span className="chip border-white/10 px-1.5 py-0 text-[10px] uppercase tracking-wide text-ink-soft">{e.type}</span><span className="num ml-auto truncate text-[10px] text-ink-mute" title={e.hash}>{e.hash.slice(0, 16)}…</span></div>
                  <div className="mt-0.5 text-sm">{e.summary}</div>
                </button>
              </li>
            )
          })}
        </ol>
      </Panel>
    </div>
  )
}
