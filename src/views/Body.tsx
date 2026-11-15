import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Activity, Bone, Brain, Ear, Eye, HeartPulse, Moon, ShieldPlus } from 'lucide-react'
import { HAZ, IND, SYSTEMS, type SystemId } from '../data/domain'
import { useHalo } from '../state/store'
import type { DriftState } from '../engine/drift'
import { Panel, Prov, ReadAloud, Seg, StatePill, STATE_META, lens, Simulated } from '../ui/kit'
import { IndicatorChart } from '../ui/charts'

const RANK: Record<DriftState, number> = { nodata: 0, ok: 1, adapt: 2, watch: 3, drift: 4 }
const ICON: Record<SystemId, typeof Brain> = { brain: Brain, eyes: Eye, sensorimotor: Ear, sleep: Moon, cardio: HeartPulse, immune: ShieldPlus, msk: Bone }
const CENTER: Record<SystemId, [number, number]> = { brain: [120, 44], eyes: [120, 66], sensorimotor: [93, 63], sleep: [163, 24], cardio: [129, 150], immune: [120, 128], msk: [120, 345] }

export function useSystemState() {
  const h = useHalo()
  return (id: SystemId): DriftState => {
    const sys = SYSTEMS.find((s) => s.id === id)!
    if (id === 'eyes' || id === 'sensorimotor') {
      const t = h.allTests.filter((x) => x.kind === (id === 'eyes' ? 'vision' : 'balance') && x.day <= h.day).at(-1)
      return t ? (t.value < 0 ? 'watch' : 'ok') : 'nodata'
    }
    return sys.indicators.reduce<DriftState>((acc, i) => (RANK[h.states[i]] > RANK[acc] ? h.states[i] : acc), 'ok')
  }
}

export function BodyView() {
  const h = useHalo()
  const [sel, setSel] = useState<SystemId>('sleep')
  const [hover, setHover] = useState<SystemId | null>(null)
  const [level, setLevel] = useState<'simple' | 'crew' | 'surgeon'>('crew')
  const stateOf = useSystemState()
  const s = SYSTEMS.find((x) => x.id === sel)!
  const st = stateOf(sel)
  const lastCheck = (k: 'vision' | 'balance') => h.allTests.filter((x) => x.kind === k && x.day <= h.day).at(-1)
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(380px,0.95fr)_1.2fr]">
      <Panel title="Body Map" kicker={`${h.mission.crew.find((c) => c.id === h.crewId)!.name} · day ${h.day}`} tour="bodymap" right={<Simulated />}>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_196px]">
          <Figure sel={sel} hover={hover} onSelect={setSel} onHover={setHover} stateOf={stateOf} />
          <ul className="grid content-start gap-1.5" aria-label="Body systems">
            {SYSTEMS.map((sys) => {
              const stt = stateOf(sys.id)
              const I = ICON[sys.id]
              const m = STATE_META[stt]
              return (
                <li key={sys.id}>
                  <button onClick={() => setSel(sys.id)} onMouseEnter={() => setHover(sys.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(sys.id)} onBlur={() => setHover(null)}
                    aria-pressed={sel === sys.id} data-system-btn={sys.id}
                    className={`focus-ring tap flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${sel === sys.id ? 'border-teal/50 bg-teal/[0.08]' : 'border-white/[0.06] hover:bg-white/[0.04]'} ${lens(h.hazard, sys.hazards)}`}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: m.color + '1f', color: m.color }}><I size={15} aria-hidden /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] text-ink">{sys.name}</span><span className={`flex items-center gap-1 text-[11px] ${m.text}`}><m.Icon size={11} aria-hidden />{m.label}</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Panel>

      <motion.div key={sel} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <Panel title={s.name} kicker={s.nasaRisk} right={<StatePill state={st} />} className={lens(h.hazard, s.hazards)}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Seg label="Explanation level" value={level} onChange={setLevel} size="sm" options={[{ v: 'simple', label: 'Simple' }, { v: 'crew', label: 'Crew' }, { v: 'surgeon', label: 'Flight surgeon' }]} />
            <ReadAloud label="Read aloud" lines={[s.name + '.', s.levels[level], 'What to do: ' + s.actions.join('. ') + '.']} />
          </div>
          <p className="rounded-2xl border border-teal/20 bg-teal/[0.06] p-3.5 text-sm leading-relaxed text-ink">{s.levels[level]}</p>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <Item k="What it does">{s.function}</Item>
            <Item k="Why spaceflight affects it">{s.why}</Item>
            <Item k="How to measure">{s.measure}</Item>
            <Item k="What to do"><ul className="list-disc space-y-0.5 pl-5">{s.actions.map((a) => <li key={a}>{a}</li>)}</ul></Item>
          </dl>
          <div className="mt-4">
            <div className="label">Driven by hazards</div>
            <div className="mt-2 flex flex-wrap gap-2">{s.hazards.map((hz) => <button key={hz} onClick={() => h.setHazard(hz)} className="chip focus-ring" style={{ borderColor: HAZ[hz].color + '55', color: HAZ[hz].color }}>{HAZ[hz].letter} · {HAZ[hz].name}</button>)}</div>
          </div>
          {s.indicators.length > 0 ? (
            <div className="mt-4 space-y-3">
              {s.indicators.slice(0, 2).map((i) => (
                <div key={i} className="rounded-2xl border border-white/[0.06] p-3">
                  <div className="mb-1 flex items-center justify-between text-sm"><span>{IND[i].name}</span><StatePill state={h.states[i]} small /></div>
                  <IndicatorChart res={h.analysis[h.crewId][i]} ind={i} day={h.day} window={45} height={160} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/[0.06] p-3 text-sm text-ink-soft">
              <div className="flex items-center gap-2"><Activity size={14} className="text-teal" aria-hidden /> Latest {sel === 'eyes' ? 'vision' : 'balance'} check: <span className="text-ink">{lastCheck(sel === 'eyes' ? 'vision' : 'balance')?.detail ?? 'none'}</span></div>
              <div className="mt-1 text-xs text-ink-mute">Weekly checks are simulated in this scenario; run a real one in <button className="text-teal underline" onClick={() => h.go('log')}>Log &amp; Measure</button>.</div>
            </div>
          )}
          <div className="mt-4"><Prov ids={s.sources} label="Sources:" /></div>
        </Panel>
      </motion.div>
    </div>
  )
}

function Item({ k, children }: { k: string; children: ReactNode }) {
  return <div><dt className="label">{k}</dt><dd className="mt-1 text-sm leading-relaxed text-ink-soft">{children}</dd></div>
}

/** Original stylised figure. No text inside the SVG, so nothing can clip; labels live in the list beside it. */
function Figure({ sel, hover, onSelect, onHover, stateOf }: { sel: SystemId; hover: SystemId | null; onSelect: (s: SystemId) => void; onHover: (s: SystemId | null) => void; stateOf: (s: SystemId) => DriftState }) {
  const h = useHalo()
  const col = (id: SystemId) => STATE_META[stateOf(id)].color
  const on = (id: SystemId) => sel === id || hover === id
  const dim = (id: SystemId) => (h.hazard && !SYSTEMS.find((x) => x.id === id)!.hazards.includes(h.hazard) ? 0.22 : 1)
  const G = (id: SystemId, children: ReactNode) => {
    const stt = stateOf(id)
    const [cx, cy] = CENTER[id]
    return (
      <g key={id} role="button" tabIndex={0} aria-label={`${SYSTEMS.find((x) => x.id === id)!.name}: ${STATE_META[stt].label}`} aria-pressed={sel === id} data-system={id}
        onClick={() => onSelect(id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id) } }}
        onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)} className="cursor-pointer outline-none [&:focus-visible>circle.ring]:opacity-100" opacity={dim(id)}
        style={{ color: col(id) }}>
        <circle className="ring" cx={cx} cy={cy} r={id === 'msk' ? 26 : 17} fill="none" stroke="#2DD4BF" strokeWidth="2" opacity={sel === id ? 0.9 : 0} />
        {(stt === 'drift' || stt === 'watch') && <circle cx={cx} cy={cy} r={12} fill="none" stroke="currentColor" strokeWidth="2" className="pulse-ring" />}
        <g filter={on(id) ? 'url(#glowStrong)' : 'url(#glowSoft)'}>{children}</g>
        <circle cx={cx} cy={cy} r={id === 'msk' ? 28 : 18} fill="transparent" />
      </g>
    )
  }
  const fill = (id: SystemId) => col(id) + (on(id) ? '55' : '33')
  return (
    <svg viewBox="0 0 240 500" className="mx-auto max-h-[600px] w-full max-w-[320px]" role="group" aria-label="Body map: select a system">
      <defs>
        <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#22314F" /><stop offset="1" stopColor="#111A2E" /></linearGradient>
        <radialGradient id="aura" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#2DD4BF" stopOpacity="0.12" /><stop offset="1" stopColor="#2DD4BF" stopOpacity="0" /></radialGradient>
        <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glowStrong" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <ellipse cx="120" cy="230" rx="118" ry="230" fill="url(#aura)" pointerEvents="none" />
      {[70, 120, 170].map((r) => <circle key={r} cx="120" cy="200" r={r} fill="none" stroke="rgba(96,165,250,0.06)" strokeDasharray="2 6" />)}
      {/* silhouette */}
      <g stroke="rgba(148,163,184,0.38)" strokeWidth="1.1" pointerEvents="none">
        {[[80, 112, 62, 196, 21], [62, 196, 54, 270, 16], [160, 112, 178, 196, 21], [178, 196, 186, 270, 16], [104, 290, 101, 390, 30], [101, 390, 99, 468, 22], [136, 290, 139, 390, 30], [139, 390, 141, 468, 22]].map(([x1, y1, x2, y2, w], k) => (
          <g key={k}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,163,184,0.38)" strokeWidth={w + 2} strokeLinecap="round" /><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#skin)" strokeWidth={w} strokeLinecap="round" /></g>
        ))}
        <ellipse cx="52" cy="284" rx="9" ry="12" fill="url(#skin)" /><ellipse cx="188" cy="284" rx="9" ry="12" fill="url(#skin)" />
        <ellipse cx="96" cy="482" rx="15" ry="8" fill="url(#skin)" /><ellipse cx="144" cy="482" rx="15" ry="8" fill="url(#skin)" />
        <path d="M86,104 Q120,94 154,104 Q170,108 172,124 L165,200 Q160,236 152,262 Q154,282 146,298 L94,298 Q86,282 88,262 Q80,236 75,200 L68,124 Q70,108 86,104 Z" fill="url(#skin)" />
        <rect x="109" y="82" width="22" height="22" rx="8" fill="url(#skin)" />
        <ellipse cx="120" cy="54" rx="28" ry="33" fill="url(#skin)" />
      </g>
      {/* anatomy hints */}
      <g stroke="rgba(45,212,191,0.16)" fill="none" strokeWidth="1" pointerEvents="none">
        <line x1="120" y1="104" x2="120" y2="262" strokeDasharray="3 4" />
        {[132, 146, 160, 174].map((y) => <path key={y} d={`M96,${y} Q120,${y + 8} 144,${y}`} />)}
        <path d="M100,124 Q92,150 96,186 Q106,196 114,184 L114,128 Z" /><path d="M140,124 Q148,150 144,186 Q134,196 126,184 L126,128 Z" />
      </g>
      {/* systems */}
      {G('brain', <><path d="M99,47 C98,32 112,24 120,29 C128,24 142,32 141,47 C146,55 138,64 130,60 C126,66 114,66 110,60 C102,64 94,55 99,47 Z" fill={fill('brain')} stroke="currentColor" strokeWidth="1.4" /><path d="M120,30 L120,62 M108,38 Q112,46 106,52 M132,38 Q128,46 134,52" stroke="currentColor" strokeWidth="1" fill="none" opacity=".7" /></>)}
      {G('eyes', <><path d="M104,66 Q110,61 116,66 Q110,71 104,66 Z M124,66 Q130,61 136,66 Q130,71 124,66 Z" fill={fill('eyes')} stroke="currentColor" strokeWidth="1.3" /><circle cx="110" cy="66" r="1.8" fill="currentColor" /><circle cx="130" cy="66" r="1.8" fill="currentColor" /></>)}
      {G('sensorimotor', <><path d="M93,63 m-1,0 a1,1 0 1,1 2,0 a3,3 0 1,1 -5,-1 a5,5 0 1,1 8,4 a7,7 0 0,1 -10,2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>)}
      {G('sleep', <><path d="M170,16 A11,11 0 1,0 170,34 A8.5,8.5 0 1,1 170,16 Z" fill={fill('sleep')} stroke="currentColor" strokeWidth="1.4" /><circle cx="152" cy="14" r="1.4" fill="currentColor" /><circle cx="157" cy="34" r="1" fill="currentColor" /></>)}
      {G('cardio', <><path d="M129,165 C112,153 113,138 122,137 C126,137 129,141 129,141 C129,141 132,137 136,137 C145,138 146,153 129,165 Z" fill={fill('cardio')} stroke="currentColor" strokeWidth="1.5" /><path d="M116,151 L122,151 L125,145 L129,157 L132,149 L142,149" fill="none" stroke="currentColor" strokeWidth="1.1" /></>)}
      {G('immune', <>{[[106, 98], [134, 98], [84, 128], [156, 128], [104, 268], [136, 268], [120, 124]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k === 6 ? 5 : 3.6} fill={fill('immune')} stroke="currentColor" strokeWidth="1.3" />)}<path d="M106,98 L84,128 M134,98 L156,128 M84,128 L104,268 M156,128 L136,268" stroke="currentColor" strokeWidth=".6" opacity=".35" fill="none" strokeDasharray="2 3" /></>)}
      {G('msk', <><g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill={fill('msk')}><line x1="104" y1="300" x2="101" y2="382" /><line x1="136" y1="300" x2="139" y2="382" /><circle cx="101" cy="390" r="6" /><circle cx="139" cy="390" r="6" /><line x1="100" y1="398" x2="99" y2="462" /><line x1="140" y1="398" x2="141" y2="462" /></g></>)}
    </svg>
  )
}
