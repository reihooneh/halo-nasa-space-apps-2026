import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { CheckSquare, CloudDownload, ExternalLink, ShieldCheck, Square, Timer, Zap } from 'lucide-react'
import { ReadAloud } from '../ui/kit'
import donkiRaw from '../data/donki.json'
import { ENV } from '../data/domain'
import { FACTS } from '../data/sources'
import { useHalo } from '../state/store'
import { cumulativeDose, dayOfDate, DONKI_MAY20_CME, DONKI_X87_CME, DONKI_X87_FLR, MISSION_DAYS, SPE_DAY, SPE_DOSE_ILLUSTRATIVE, fmtDate } from '../sim/mission'
import { FactLine, Illustrative, Panel, Prov, Simulated } from '../ui/kit'

interface Flr { id: string; cls: string; begin: string; peak: string; loc: string; ar: number | null; note: string; link: string; linked: string[] }
interface Cme { id: string; start: string; speed: number | null; type: string | null; note: string; link: string; marsArrivals: string[]; linked: string[]; loc: string | null }
interface Sep { id: string; time: string; instruments: string[]; link: string; linked: string[] }
const DONKI = donkiRaw as unknown as { meta: { counts: { flr: number; cme: number; sep: number }; coverage: Record<string, string[]> }; flr: Flr[]; cme: Cme[]; sep: Sep[] }

export function flareFlux(cls: string): number {
  const m: Record<string, number> = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }
  return (m[cls[0]] ?? 1e-6) * parseFloat(cls.slice(1) || '1')
}

const CHECK = ['Move to the storm shelter (water / stowage-lined area)', 'Bring personal dosimeter', 'Secure loose items on the way', 'Close hatch; confirm all 4 crew present', 'Report “in shelter” (auto-queued to ground)', 'Stay until HALO gives all-clear']

export function RadiationView() {
  const h = useHalo()
  const env = ENV[h.env]
  const doseNow = cumulativeDose(h.mission, h.day)
  const ledger = useMemo(() => Array.from({ length: MISSION_DAYS }, (_, k) => ({ d: k + 1, cum: k + 1 <= h.day ? cumulativeDose(h.mission, k + 1) : null, proj: cumulativeDose(h.mission, k + 1) })), [h.mission, h.day])
  const flares = useMemo(() => DONKI.flr.map((f) => ({ d: dayOfDate(f.peak || f.begin), flux: flareFlux(f.cls), cls: f.cls, id: f.id })).filter((x) => x.d >= 1 && x.d <= MISSION_DAYS), [])
  const [checked, setChecked] = useState<boolean[]>(CHECK.map(() => false))
  const [drill, setDrill] = useState(false)
  const [count, setCount] = useState(20 * 60)
  const active = h.speActive || drill
  useEffect(() => {
    if (!active) return
    setCount(20 * 60)
    const iv = window.setInterval(() => setCount((c) => Math.max(0, c - 7)), 1000)
    return () => window.clearInterval(iv)
  }, [active])
  const near = useMemo(() => {
    const evs = [
      ...DONKI.flr.filter((f) => /^[MX]/.test(f.cls)).map((f) => ({ kind: 'Flare', id: f.id, d: dayOfDate(f.peak || f.begin), title: `${f.cls} flare${f.ar ? ` · AR ${f.ar}` : ''}`, sub: f.note, link: f.link })),
      ...DONKI.cme.filter((c) => (c.speed ?? 0) >= 1000).map((c) => ({ kind: 'CME', id: c.id, d: dayOfDate(c.start), title: `CME ${c.speed} km/s${c.marsArrivals.length ? ' · Mars arrival modelled' : ''}`, sub: c.note, link: c.link })),
      ...DONKI.sep.map((s) => ({ kind: 'SEP', id: s.id, d: dayOfDate(s.time), title: `Solar energetic particle event`, sub: s.instruments.join(', '), link: s.link })),
    ]
    return evs.filter((e) => Math.abs(e.d - h.day) <= 6).sort((a, b) => a.d - b.d)
  }, [h.day])
  const x87 = DONKI.flr.find((f) => f.id === DONKI_X87_FLR)!, x87c = DONKI.cme.find((c) => c.id === DONKI_X87_CME)!, m20 = DONKI.cme.find((c) => c.id === DONKI_MAY20_CME)!
  const mm = Math.floor(count / 60), ss = count % 60
  return (
    <div className="space-y-5">
      {active && (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]" data-tour="shelter">
          <Panel title={h.speActive ? 'Solar particle event: shelter protocol' : 'Shelter drill'} kicker="Storm shelter" className="border-alert/40" right={<span className="chip border-alert/50 bg-alert/10 text-alert"><Zap size={12} /> Active</span>}>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-alert/40 bg-alert/10 px-4 py-3 text-center"><div className="label text-alert">Shelter within</div><div className="num text-3xl text-alert"><Timer size={18} className="mr-1 inline" aria-hidden />{mm}:{String(ss).padStart(2, '0')}</div></div>
              <div><p className="text-sm text-ink-soft">On 20 May 2024 the flare’s X-rays reached Mars at light speed and charged particles followed within tens of minutes (NASA). HALO starts a 20-minute shelter clock (shown accelerated).</p><div className="mt-2"><ReadAloud label="Read the checklist aloud" lines={['Solar particle event. Shelter now.', ...CHECK.map((c, k) => `Step ${k + 1}. ${c}.`)]} /></div></div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {CHECK.map((c, k) => (
                <li key={c}><button className="focus-ring tap flex w-full items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-left text-sm hover:bg-white/[0.04]" onClick={() => { const n = [...checked]; n[k] = !n[k]; setChecked(n); if (n.every(Boolean)) { h.addAction('Shelter checklist complete'); h.pushToast('All crew in shelter', 'Checklist complete. Report queued for downlink.', 'ok') } }} aria-pressed={checked[k]}>
                  {checked[k] ? <CheckSquare size={16} className="text-ok" aria-hidden /> : <Square size={16} className="text-ink-mute" aria-hidden />}{c}</button></li>
              ))}
            </ul>
            {drill && <button className="btn-ghost mt-3" onClick={() => { setDrill(false); setChecked(CHECK.map(() => false)) }}>End drill</button>}
          </Panel>
          <Panel title="Shelter map" kicker="Illustrative cabin plan" right={<Illustrative text="Illustrative layout" />}>
            <ShelterMap />
          </Panel>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Cumulative dose ledger" kicker={`${env.name} · mission to date`} tour="dose" right={<><Simulated /></>}>
          <div className="flex flex-wrap items-end gap-6">
            <div><div className="label">Mission dose</div><div className="num text-3xl">{doseNow} <span className="text-sm text-ink-mute">mSv</span></div></div>
            <div><div className="label">Of career limit</div><div className="num text-xl">{((doseNow / 600) * 100).toFixed(1)}%</div></div>
            <div><div className="label">Shelter used on D{SPE_DAY}</div><div className="num text-xl">{h.mission.sheltered ? 'Yes' : 'No'}</div></div>
          </div>
          <div className="mt-3" style={{ height: 220 }} role="img" aria-label="Cumulative radiation dose chart">
            <ResponsiveContainer>
              <ComposedChart data={ledger} margin={{ top: 22, right: 14, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => `D${d}`} minTickGap={30} />
                <YAxis tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 620]} width={44} />
                <Tooltip contentStyle={{ background: '#0F1626', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: any, n) => [`${v} mSv`, n === 'cum' ? 'Cumulative' : 'Projected']} labelFormatter={(d) => `Day ${d}`} />
                <ReferenceLine y={600} stroke="#F43F5E" strokeDasharray="4 4" label={{ value: 'Career limit 600 mSv (NASA-STD-3001)', fill: '#F43F5E', fontSize: 10, position: 'insideBottomLeft' }} />
                <ReferenceLine x={SPE_DAY} stroke="#F59E0B" strokeOpacity={0.6} label={{ value: `Solar storm D${SPE_DAY}`, fill: '#F59E0B', fontSize: 10, position: 'insideBottomRight' }} />
                <Line dataKey="proj" stroke="#A9B6CC" strokeOpacity={0.3} strokeDasharray="3 5" dot={false} isAnimationActive={false} />
                <Line dataKey="cum" stroke="#F59E0B" strokeWidth={2.2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            <FactLine id={env.doseFact} compact />
            <FactLine id="careerLimit" compact />
            <FactLine id="speLimit" compact />
            <FactLine id="issDose" compact />
            <FactLine id="neutronShare" compact />
          </div>
          <div className="mt-2 text-[11px] text-ink-mute">Ledger uses the measured Curiosity cruise rate for every transit day. The extra dose on D{SPE_DAY} is illustrative: +{SPE_DOSE_ILLUSTRATIVE.sheltered} mSv sheltered vs +{SPE_DOSE_ILLUSTRATIVE.unsheltered} mSv unsheltered (not measured values).</div>
        </Panel>

        <Panel title="The real storm behind the scenario" kicker="NASA CCMC DONKI · May 2024" tour="storm" right={<Prov ids={['donki', 'marsStorm']} />}>
          <ol className="space-y-3 text-sm">
            <li className="rounded-xl border border-white/[0.07] p-3">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">D84 · {x87.cls} flare, AR {x87.ar}</span><DonkiLink href={x87.link} /></div>
              <div className="mt-1 text-xs text-ink-soft">{x87.note} Linked CME: 2,119–2,225 km/s (DONKI analyses); modelled Mars arrival 16 May 19:08 to 17 May 02:11 UTC. <DonkiLink href={x87c.link} small /></div>
            </li>
            <li className="rounded-xl border border-alert/30 bg-alert/[0.05] p-3">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">D90 · Fast halo CME, up to <span className="num">2,678</span> km/s</span><DonkiLink href={m20.link} /></div>
              <div className="mt-1 text-xs text-ink-soft">{m20.note}</div>
              <div className="mt-2 text-xs text-ink"><b>At Mars (NASA):</b> an astronaut beside Curiosity would have received {FACTS.may20Dose.value}, the largest surge RAD had measured since landing. NASA later estimated the flare at X12 from Solar Orbiter data. Particles reached Mars within tens of minutes. <a className="text-teal underline" href="https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm" target="_blank" rel="noreferrer">NASA article</a></div>
            </li>
          </ol>
          <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-[11px] text-ink-mute">Scenario: the mission calendar starts 21 Feb 2024, so real May 2024 events land on mission days {dayOfDate('2024-05-01T00:00Z')}–{dayOfDate('2024-05-31T23:00Z')}. The crew, spacecraft and crew doses are simulated; the space weather is real.</div>
          {!active && <button className="btn-ghost mt-3 w-full" onClick={() => setDrill(true)}><ShieldCheck size={15} aria-hidden /> Run a shelter drill</button>}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Solar flares on the mission calendar" kicker={`${DONKI.meta.counts.flr} flares · ${DONKI.meta.counts.cme} CMEs · ${DONKI.meta.counts.sep} SEP events (real)`} right={<Prov ids={['donki']} />}>
          <div style={{ height: 220 }} role="img" aria-label="Solar flare intensity by mission day">
            <ResponsiveContainer>
              <ComposedChart margin={{ top: 22, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis type="number" dataKey="d" domain={[66, 106]} tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d) => `D${d}`} />
                <YAxis type="number" dataKey="flux" scale="log" domain={[1e-6, 2e-3]} tick={{ fill: '#A9B6CC', fontSize: 11 }} tickLine={false} axisLine={false} width={40} ticks={[1e-6, 1e-5, 1e-4, 1e-3]} tickFormatter={(v) => (v >= 1e-3 ? 'X10' : v >= 1e-4 ? 'X1' : v >= 1e-5 ? 'M1' : 'C1')} />
                <ZAxis range={[28, 28]} />
                <Tooltip contentStyle={{ background: '#0F1626', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(_: any, __: any, p: any) => [p.payload.cls, 'Class']} labelFormatter={() => ''} />
                <ReferenceLine x={h.day} stroke="#2DD4BF" label={{ value: `D${h.day}`, fill: '#2DD4BF', fontSize: 10, position: 'insideTopRight' }} />
                <Scatter data={flares} fill="#F59E0B" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-[11px] text-ink-mute">Peak X-ray class by mission day (log scale: C1 &lt; M1 &lt; X1 &lt; X10). The {x87.cls} on D84 is the largest flare in the set; the 20 May far-side eruption was not seen from Earth.</div>
        </Panel>
        <Panel title={`Space weather near D${h.day}`} kicker="± 6 days · every event links to DONKI">
          {near.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-ink-soft">
              Quiet sun around {fmtDate(h.day)}: no M/X flares, fast CMEs or SEP events within 6 days. The cache covers flares and CMEs in May 2024 (D71–D101) and SEP events 9 May–12 June (D79–D113).
              <div className="mt-3 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => h.setDay(SPE_DAY)} data-jump-90><Zap size={14} aria-hidden /> Jump to the storm · D{SPE_DAY}</button><button className="btn-ghost" onClick={() => h.setDay(84)}>X8.7 flare · D84</button></div>
            </div>
          ) : (
            <ul className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1 scroll-thin">
              {near.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] px-3 py-2">
                  <div className="min-w-0"><div className="text-sm"><span className="num mr-2 text-xs text-ink-mute">D{e.d}</span>{e.title}</div><div className="truncate text-[11px] text-ink-mute">{e.sub}</div></div>
                  <DonkiLink href={e.link} small />
                </li>
              ))}
            </ul>
          )}
          <LiveDonki />
        </Panel>
      </div>
    </div>
  )
}

function DonkiLink({ href, small }: { href: string; small?: boolean }) {
  return <a href={href} target="_blank" rel="noreferrer" className={`focus-ring inline-flex shrink-0 items-center gap-1 rounded-md border border-teal/25 bg-teal/[0.07] px-1.5 py-0.5 ${small ? 'text-[10px]' : 'text-[11px]'} text-teal hover:bg-teal/15`}>NASA CCMC DONKI <ExternalLink size={10} aria-hidden /></a>
}

function LiveDonki() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'fallback'>('idle')
  const [msg, setMsg] = useState('')
  const run = async () => {
    setState('loading')
    const end = new Date(), start = new Date(Date.now() - 30 * 86400000)
    const q = `startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`
    const ctl = new AbortController(); const t = window.setTimeout(() => ctl.abort(), 7000)
    try {
      const r = await fetch(`https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?${q}`, { signal: ctl.signal })
      const ct = r.headers.get('content-type') || ''
      if (!r.ok || !ct.includes('json')) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setState('ok'); setMsg(`Live: ${Array.isArray(j) ? j.length : 0} flares in the last 30 days from ccmc.gsfc.nasa.gov/DONKI-API. The scenario keeps using the cached May 2024 events.`)
    } catch (e) {
      setState('fallback'); setMsg(`Live DONKI unavailable here (${(e as Error).name === 'AbortError' ? 'timeout' : 'network/CORS'}). HALO stays on the bundled cache of real events.`)
    } finally { window.clearTimeout(t) }
  }
  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] p-3 text-xs">
      <div className="flex items-center justify-between gap-2"><span className="text-ink-soft">Default: bundled cache ({DONKI.meta.counts.flr + DONKI.meta.counts.cme + DONKI.meta.counts.sep} real events). Works offline.</span>
        <button className="btn-ghost px-2.5 py-1 text-xs" onClick={run} disabled={state === 'loading'}><CloudDownload size={13} aria-hidden />{state === 'loading' ? 'Checking…' : 'Try live DONKI'}</button></div>
      {msg && <div className={`mt-2 ${state === 'ok' ? 'text-ok' : 'text-warn'}`} role="status">{msg}</div>}
      <div className="mt-1.5"><Prov ids={['donkiMove']} label="API endpoint:" /></div>
    </div>
  )
}

function ShelterMap() {
  return (
    <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="Illustrative cabin plan: crew quarters to water-wall storm shelter route">
      <rect x="10" y="20" width="380" height="180" rx="40" fill="#0B1120" stroke="rgba(148,163,184,0.35)" />
      {[['Galley', 30, 40, 90, 60], ['Exercise', 30, 120, 90, 60], ['Crew quarters', 130, 40, 110, 60], ['Lab', 130, 120, 110, 60]].map(([n, x, y, w, hh]) => (
        <g key={n as string}><rect x={x as number} y={y as number} width={w as number} height={hh as number} rx="10" fill="#141D31" stroke="rgba(148,163,184,0.25)" /><text x={(x as number) + 8} y={(y as number) + 18} fontSize="11" fill="#A9B6CC">{n as string}</text></g>
      ))}
      <rect x="256" y="46" width="122" height="128" rx="14" fill="rgba(45,212,191,0.12)" stroke="#2DD4BF" strokeWidth="2" />
      <text x="317" y="68" fontSize="11" fill="#2DD4BF" fontWeight="600" textAnchor="middle">Storm shelter</text>
      <text x="317" y="84" fontSize="9" fill="#A9B6CC" textAnchor="middle">water + stowage walls</text>
      {[0, 1, 2, 3].map((k) => <circle key={k} cx={285 + k * 22} cy={130} r="7" fill="#2DD4BF" opacity=".85" />)}
      <path d="M185 70 C 230 70, 230 100, 262 105" stroke="#F59E0B" strokeWidth="2.5" fill="none" className="signal-dash" markerEnd="url(#arr)" />
      <path d="M75 150 C 140 200, 230 190, 262 140" stroke="#F59E0B" strokeWidth="2.5" fill="none" className="signal-dash" />
      <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#F59E0B" /></marker></defs>
      <text x="20" y="214" fontSize="9" fill="#7D8BA5">Dashed amber = route to shelter. Illustrative layout, not a real vehicle.</text>
    </svg>
  )
}
