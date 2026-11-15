import { Database, Download, ExternalLink } from 'lucide-react'
import { FACTS, SOURCES, type Org } from '../data/sources'
import { HAZARDS, INDICATORS } from '../data/domain'
import { useHalo } from '../state/store'
import { CREW, dayOfIdx, fmtDate, IND_IDS, TOTAL, PRE_DAYS, SPE_DAY, WATCH_DAY } from '../sim/mission'
import { DRIFT_PARAMS } from '../engine/drift'
import { Panel, Prov, download, Illustrative } from '../ui/kit'

const ORDER: Org[] = ['NASA', 'NASA CCMC', 'CSA', 'NASA-funded study', 'Peer-reviewed', 'Other', 'Space Apps']

export function SourcesView() {
  const h = useHalo()
  return (
    <div className="space-y-5">
      <Panel title="Science & Sources" kicker="Every number in HALO comes from here" tour="sources">
        <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-3 text-sm text-ink-soft">
          <b className="text-warn">Disclaimer.</b> HALO is a NASA Space Apps prototype. Crew data is <b>simulated</b> and the crew is fictional. HALO is <b>not a medical device</b> and gives no diagnosis or drug dosing. Drift and triage thresholds are <b>illustrative, not medical advice</b>. Space-weather events are real NASA CCMC DONKI records placed on a scenario calendar.
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="The five hazards (RIDGE)" kicker="NASA Human Research Program">
          <ul className="space-y-3">
            {HAZARDS.map((hz) => (
              <li key={hz.id} className="rounded-xl border border-white/[0.07] p-3">
                <div className="flex items-center gap-2"><span className="num flex h-6 w-6 items-center justify-center rounded-md text-sm font-bold" style={{ background: hz.color + '22', color: hz.color }}>{hz.letter}</span><span className="font-medium">{hz.name}</span></div>
                <p className="mt-1 text-sm text-ink-soft">{hz.summary}</p>
                <div className="mt-1 text-xs text-ink-mute">Countermeasures: {hz.countermeasures.join(' · ')}</div>
                <div className="mt-1.5"><Prov ids={hz.sources} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-5">
          <Panel title="Facts and numbers used" kicker="Value · status · source">
            <ul className="space-y-2">
              {Object.values(FACTS).map((f) => (
                <li key={f.id} className="rounded-xl border border-white/[0.06] px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-ink-soft">{f.label}</span><span className="num text-ink">{f.value}</span></div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">{f.kind === 'illustrative' && <Illustrative text="Illustrative / verify" />}<Prov ids={f.sources} /></div>
                  {f.note && <div className="mt-1 text-[11px] text-ink-mute">{f.note}</div>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="All sources" kicker="For the References field">
          {ORDER.map((org) => {
            const list = Object.values(SOURCES).filter((s) => s.org === org)
            if (!list.length) return null
            return (
              <div key={org} className="mb-3">
                <div className="label mb-1">{org === 'CSA' ? 'CSA (Space Agency Partner)' : org}</div>
                <ul className="space-y-1">{list.map((s) => <li key={s.id}><a className="focus-ring inline-flex items-start gap-1.5 text-sm text-ink-soft hover:text-teal" href={s.url} target="_blank" rel="noreferrer"><ExternalLink size={12} className="mt-1 shrink-0" aria-hidden /><span>{s.title}{s.official && <span className="ml-1.5 chip border-teal/30 px-1.5 py-0 text-[10px] text-teal">Official challenge resource</span>}</span></a></li>)}</ul>
              </div>
            )
          })}
        </Panel>
        <DatasetExport h={h} />
      </div>
    </div>
  )
}

/** F25: Open Synthetic Astronaut Dataset */
function DatasetExport({ h }: { h: ReturnType<typeof useHalo> }) {
  const csv = () => {
    const rows = ['crew_id,crew_name,mission_day,date,' + IND_IDS.join(',') + ',' + IND_IDS.map((i) => `${i}_state`).join(',')]
    for (const c of CREW) for (let i = 0; i < TOTAL; i++) {
      const d = dayOfIdx(i)
      rows.push([c.id, c.name, d, d >= 1 ? fmtDate(d) : '', ...IND_IDS.map((k) => h.mission.series[c.id][k][i] ?? ''), ...IND_IDS.map((k) => h.analysis[c.id][k][i].state)].join(','))
    }
    return rows.join('\n')
  }
  const dict = `# HALO Open Synthetic Astronaut Dataset: data dictionary

All values are SIMULATED for a fictional 4-person crew. Not real astronaut data. Not medical data.

| column | unit | description |
|---|---|---|
| crew_id, crew_name | - | fictional crew member |
| mission_day | day | ${-(PRE_DAYS - 1)}..0 = pre-flight baseline; 1..180 = Mars transit |
| date | ISO | scenario calendar; day 1 = 2024-02-21 so real May 2024 NASA DONKI space weather lands on days 71-101 |
${INDICATORS.map((i) => `| ${i.id} | ${i.unit} | ${i.name} |`).join('\n')}
| *_state | - | HALO drift-engine output: ok, watch, drift, adapt, nodata |

## How it was generated
- Seeded PRNG (mulberry32, seed 2026): identical output on every run.
- Each crew member has a personal baseline (mean, SD) per indicator; daily value = baseline + scripted effects + Gaussian noise; ~3% of in-flight days missing at random.
- Scripted effects: early adaptation (days 1-10), Leila's sleep decline (days 38-66, recovery after countermeasure), space-weather stress around day ${SPE_DAY} (real 20 May 2024 storm; watch from day ${WATCH_DAY}), a mild mid-mission morale lull (days 96-140), Leila's exercise slip (days 112-140), and a fever (days 156-159).
- Drift engine: robust z vs. pre-flight median/MAD with EWMA rolling centre, z >= ${DRIFT_PARAMS.zWatch} for ${DRIFT_PARAMS.persistDays} days = drift (illustrative thresholds).
- Licence: CC0 (synthetic data).
`
  const readme = `# HALO synthetic dataset\n\nFiles: halo-synthetic-crew.csv, halo-synthetic-crew.json, DATA_DICTIONARY.md.\nGenerated in-browser by HALO (NASA Space Apps 2026). Simulated data only.\n`
  return (
    <Panel title="Open Synthetic Astronaut Dataset" kicker="CSV + JSON + data dictionary" tour="dataset" right={<Database size={16} className="text-teal" />}>
      <p className="text-sm text-ink-soft">Export the full simulated 4-person, 201-day dataset (pre-flight + 180-day transit), with HALO’s drift states, so other teams and students can test their own methods.</p>
      <div className="mt-3 grid gap-2">
        <button className="btn-ghost justify-start" onClick={() => download('halo-synthetic-crew.csv', csv(), 'text/csv')}><Download size={15} aria-hidden /> halo-synthetic-crew.csv</button>
        <button className="btn-ghost justify-start" onClick={() => download('halo-synthetic-crew.json', JSON.stringify({ generator: 'HALO', seed: h.mission.seed, simulated: true, crew: CREW.map((c) => ({ id: c.id, name: c.name, role: c.role })), preDays: PRE_DAYS, series: h.mission.series }, null, 0), 'application/json')}><Download size={15} aria-hidden /> halo-synthetic-crew.json</button>
        <button className="btn-ghost justify-start" onClick={() => download('DATA_DICTIONARY.md', dict, 'text/markdown')}><Download size={15} aria-hidden /> DATA_DICTIONARY.md</button>
        <button className="btn-ghost justify-start" onClick={() => download('README-dataset.md', readme, 'text/markdown')}><Download size={15} aria-hidden /> README-dataset.md</button>
      </div>
    </Panel>
  )
}
