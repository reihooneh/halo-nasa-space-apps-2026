import { useState } from 'react'
import { Moon, Sun, Sunrise } from 'lucide-react'
import { FACTS } from '../data/sources'
import { useHalo } from '../state/store'
import { PRE_DAYS } from '../sim/mission'
import { Illustrative, Panel, Prov, Seg, Simulated } from '../ui/kit'
import { SubHead } from './Sensors'

/** Mars solar day (sol): 24 h 39 min 35 s (NASA). */
export const SOL_MIN = 24 * 60 + 39 + 35 / 60
export const SOL_DRIFT_MIN = SOL_MIN - 24 * 60 // ≈ 39.58 min later on the Earth clock each sol
const fmt = (min: number) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }

/** Sleep/wake windows for sol n (1-based) expressed on the Earth clock, given a fixed local Mars wake time. */
export function solPlan(n: number, wakeLocalMin: number, sleepH: number, startEarthMin = wakeLocalMin) {
  const wakeEarth = startEarthMin + (n - 1) * SOL_DRIFT_MIN
  return { wakeEarth, sleepEarth: wakeEarth - sleepH * 60 }
}

export function SolView() {
  const h = useHalo()
  const [wake, setWake] = useState<'360' | '420' | '480'>('420')
  const [sleepH, setSleepH] = useState<'7' | '7.5' | '8' | '8.5'>('8')
  const [sols, setSols] = useState<'14' | '28' | '37'>('14')
  const W = Number(wake), S = Number(sleepH), N = Number(sols)
  const rows = Array.from({ length: N }, (_, i) => ({ n: i + 1, ...solPlan(i + 1, W, S) }))
  const totalShift = (N - 1) * SOL_DRIFT_MIN
  const realign = 1440 / SOL_DRIFT_MIN
  const idx = PRE_DAYS - 1 + h.day
  const crewSleep = h.mission.crew.map((c) => {
    const vals = h.analysis[c.id].sleep.slice(Math.max(0, idx - 6), idx + 1).map((r) => r.value).filter((v): v is number => v != null)
    return { name: c.name, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
  })
  const rowH = N > 30 ? 13 : N > 20 ? 15 : 23, top = 26, Wd = 640, L = 52, R = 12, Hh = top + rowH * N + 26
  const X = (m: number) => L + (Math.max(0, Math.min(1440, m)) / 1440) * (Wd - L - R)
  const seg = (a: number, b: number) => { // [a,b) in minutes, may wrap past midnight
    const A = ((a % 1440) + 1440) % 1440, len = b - a
    return A + len <= 1440 ? [[A, A + len]] : [[A, 1440], [0, A + len - 1440]]
  }
  return (
    <div className="space-y-5">
      <SubHead n="1" title="The sol problem" text="A Mars day is about 40 minutes longer than an Earth day, so a fixed Mars routine slides around the Earth clock every sol." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { k: 'Mars solar day (sol)', v: '24 h 39 min 35 s', s: <Prov ids={FACTS.marsSol.sources} /> },
          { k: 'Shift vs Earth clock', v: `+${SOL_DRIFT_MIN.toFixed(1)} min / sol`, s: <span className="text-[11px] text-ink-mute">computed from the sol length</span> },
          { k: `Shift after ${N} sols`, v: `${Math.floor(totalShift / 60)} h ${Math.round(totalShift % 60)} min`, s: <span className="text-[11px] text-ink-mute">ground teams must follow or hand over</span> },
          { k: 'Back in step with Earth', v: `every ≈${realign.toFixed(1)} sols`, s: <span className="text-[11px] text-ink-mute">1,440 min ÷ {SOL_DRIFT_MIN.toFixed(2)} min</span> },
        ].map((c) => <div key={c.k} className="panel tilt p-4"><div className="label">{c.k}</div><div className="num mt-1 text-lg font-semibold text-ink">{c.v}</div><div className="mt-1">{c.s}</div></div>)}
      </div>

      <SubHead n="2" title="Plan" text="Pick a local wake time and a sleep opportunity. HALO lays out each sol on the Earth clock." />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Sol schedule on the Earth clock" kicker="Mars surface stay · sleep window per sol" right={<Illustrative text="Planning aid" />}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Seg size="sm" label="Local wake time" value={wake} onChange={setWake} options={[{ v: '360', label: 'Wake 06:00' }, { v: '420', label: '07:00' }, { v: '480', label: '08:00' }]} />
            <Seg size="sm" label="Sleep opportunity" value={sleepH} onChange={setSleepH} options={[{ v: '7', label: '7 h' }, { v: '7.5', label: '7.5 h' }, { v: '8', label: '8 h' }, { v: '8.5', label: '8.5 h' }]} />
            <Seg size="sm" label="Sols shown" value={sols} onChange={setSols} options={[{ v: '14', label: '14 sols' }, { v: '28', label: '28' }, { v: '37', label: '37' }]} />
          </div>
          <svg viewBox={`0 0 ${Wd} ${Hh}`} className="w-full" role="img" aria-label={`Sleep windows for ${N} sols drawn on a 24-hour Earth clock. Each sol the window starts ${SOL_DRIFT_MIN.toFixed(1)} minutes later.`} data-sol-chart>
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hr) => <g key={hr}><line x1={X(hr * 60)} x2={X(hr * 60)} y1={top - 6} y2={top + rowH * N} stroke="#fff" strokeOpacity={hr % 12 === 0 ? 0.12 : 0.05} /><text x={X(hr * 60)} y={top - 10} fontSize="10" fill="#7C8AA5" textAnchor="middle">{String(hr).padStart(2, '0')}:00</text></g>)}
            {rows.map((r, i) => {
              const y = top + i * rowH
              return (
                <g key={r.n}>
                  {(N <= 20 || r.n % 2 === 1) && <text x={L - 8} y={y + rowH * 0.7} fontSize="9.5" fill="#A9B6CC" textAnchor="end">Sol {r.n}</text>}
                  {seg(r.wakeEarth, r.wakeEarth + 120).map(([a, b], k) => <rect key={'l' + k} x={X(a)} y={y + 2} width={X(b) - X(a)} height={rowH - 4} rx="3" fill="#2DD4BF" fillOpacity="0.28" />)}
                  {seg(r.sleepEarth - 60, r.sleepEarth).map(([a, b], k) => <rect key={'d' + k} x={X(a)} y={y + 2} width={X(b) - X(a)} height={rowH - 4} rx="3" fill="#F59E0B" fillOpacity="0.25" />)}
                  {seg(r.sleepEarth, r.wakeEarth).map(([a, b], k) => <rect key={'s' + k} x={X(a)} y={y + 2} width={X(b) - X(a)} height={rowH - 4} rx="3" fill="#6366F1" fillOpacity="0.75" />)}
                </g>
              )
            })}
            <text x={L} y={Hh - 6} fontSize="10" fill="#7C8AA5">Earth clock (mission control time). Local Mars wake stays at {fmt(W)} every sol.</text>
          </svg>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-mute">
            <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-indigo-500 align-middle" />sleep window</span>
            <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-teal/40 align-middle" />bright light after waking (2 h)</span>
            <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-warn/40 align-middle" />dim light before sleep (1 h)</span>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title="Tonight’s plan" kicker={`Sol ${Math.min(N, 3)} example`}>
            {(() => { const r = rows[Math.min(N, 3) - 1]; return (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Moon size={15} className="text-indigo-300" aria-hidden />Sleep {fmt(W - S * 60)} → {fmt(W)} local <span className="num ml-auto text-xs text-ink-mute">Earth {fmt(r.sleepEarth)}–{fmt(r.wakeEarth)}</span></li>
                <li className="flex items-center gap-2"><Sunrise size={15} className="text-teal" aria-hidden />Bright, blue-enriched light {fmt(W)}–{fmt(W + 120)}</li>
                <li className="flex items-center gap-2"><Sun size={15} className="text-warn" aria-hidden />Dim, warm light from {fmt(W - S * 60 - 60)}; screens off</li>
              </ul>) })()}
            <p className="mt-3 text-[11px] text-ink-mute">Light timing uses the same countermeasure as HALO’s sleep protocol; it is a planning aid, not a prescription.</p>
          </Panel>
          <Panel title="Is the crew getting enough?" kicker="Last 7 days vs targets" right={<Simulated />}>
            <ul className="space-y-2">{crewSleep.map((c) => (
              <li key={c.name} className="text-sm">
                <div className="flex justify-between"><span>{c.name}</span><span className="num">{c.avg != null ? `${c.avg.toFixed(1)} h` : '—'}</span></div>
                <div className="relative mt-1 h-2 rounded-full bg-white/[0.06]">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, ((c.avg ?? 0) / 9) * 100)}%`, background: (c.avg ?? 0) >= 7 ? '#2DD4BF' : (c.avg ?? 0) > 6 ? '#60A5FA' : '#F59E0B' }} />
                  <span className="absolute -top-0.5 h-3 w-0.5 bg-ink" style={{ left: `${(7 / 9) * 100}%` }} title="AASM 7 h" />
                  <span className="absolute -top-0.5 h-3 w-0.5 bg-warn" style={{ left: `${(6.09 / 9) * 100}%` }} title="ISS average 6.09 h" />
                </div>
              </li>))}</ul>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-mute"><span>White tick: AASM 7 h · amber tick: ISS average {FACTS.sleepIss.value}</span><Prov ids={['aasmSleep', 'sleepStudy']} /></div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
