import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Send, Zap } from 'lucide-react'
import { ENV, ENVIRONMENTS, autonomyFor, fmtDelay } from '../data/domain'
import { useHalo } from '../state/store'
import { FactLine, Panel, Seg } from '../ui/kit'

/** Demo time compression so a 20-minute delay plays in ~20 s. Real delay is always shown. */
export function compression(delaySec: number) { return Math.max(1, delaySec / 20) }

export function GroundView() {
  const h = useHalo()
  const [now, setNow] = useState(Date.now())
  const [text, setText] = useState('')
  useEffect(() => { const iv = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(iv) }, [])
  const scale = compression(h.delaySec)
  const msgs = h.messages.slice().reverse()
  const inFlight = h.messages.filter((m) => (now - m.sentAt) / 1000 < m.delaySec / compression(m.delaySec) && (now - m.sentAt) >= 0)
  const urgent = h.triage.level === 'urgent'
  return (
    <div className="space-y-5">
      {urgent && (
        <div className="rounded-2xl border border-alert/40 bg-alert/[0.08] p-4" role="status" data-acted>
          <div className="flex flex-wrap items-center gap-3"><Zap className="text-alert" size={18} aria-hidden />
            <div className="min-w-0 flex-1"><div className="font-semibold text-alert">HALO acted now: {h.triage.hits.find((x) => x.level === 'urgent')?.title}</div>
              <div className="text-sm text-ink-soft">{h.autonomy === 'autonomous' ? `Protocol running on board. ${h.t('ground')[0].toUpperCase() + h.t('ground').slice(1)} reply expected in ~${Math.max(1, Math.round((h.delaySec * 2) / 60))} min (round trip), plus ${h.t('surgeon')} review time.` : `Ground can answer in ~${fmtDelay(Math.round(h.delaySec * 2))} round trip.`}</div></div>
            <button className="btn-danger" onClick={() => h.sendGround(`URGENT D${h.day}: ${h.triage.hits.filter((x) => x.level === 'urgent').map((x) => x.title).join('; ')}`, 'packet')}><Send size={15} aria-hidden /> Send urgent packet</button>
          </div>
        </div>
      )}
      <Panel title={h.earthMode ? 'Specialist Link' : 'Ground Link'} kicker={`${ENV[h.env].name} · one-way ${fmtDelay(h.delaySec)}`} tour="groundlink" right={<span className={`chip ${h.autonomy === 'autonomous' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-ok/40 bg-ok/10 text-ok'}`}>{h.autonomy === 'autonomous' ? 'Autonomous mode' : h.autonomy === 'delayed' ? 'Delayed assist' : 'Ground-linked'}</span>}>
        <LinkAnim delay={h.delaySec} packets={inFlight.map((m) => ({ id: m.id, dir: m.dir, p: Math.min(1, ((now - m.sentAt) / 1000) / (m.delaySec / compression(m.delaySec))) }))} />
        <div className="mt-2 text-center text-[11px] text-ink-mute">Small dots = routine telemetry (illustrative). Large dots = your messages. Packets move {scale > 1 ? `${Math.round(scale)}× faster than real time so you can watch them` : 'in real time'} · true one-way delay {fmtDelay(h.delaySec)} · round trip {fmtDelay(h.delaySec * 2)}</div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Message queue" kicker="Store-and-forward">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; h.sendGround(text.trim()); setText('') }}>
            <label htmlFor="gmsg" className="sr-only">Message to ground</label>
            <input id="gmsg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message to flight surgeon…" className="focus-ring flex-1 rounded-xl border border-white/10 bg-space-900 px-3 py-2 text-sm" />
            <button className="btn-primary" type="submit"><Send size={15} aria-hidden /> Send</button>
          </form>
          <button className="btn-ghost mt-2 w-full" onClick={() => h.sendGround(`Health packet D${h.day}: triage ${h.triage.level}, CHI ${h.chi.score}`, 'packet')}>Queue today’s health packet</button>
          <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1 scroll-thin" aria-live="polite">
            {msgs.length === 0 && <li className="text-sm text-ink-mute">No messages yet. Send one to watch the delay.</li>}
            {msgs.map((m) => {
              const sc = compression(m.delaySec)
              const el = (now - m.sentAt) / 1000
              const arrived = el >= m.delaySec / sc
              const eta = Math.max(0, m.delaySec - el * sc)
              return (
                <li key={m.id} className={`rounded-xl border px-3 py-2 text-sm ${m.dir === 'down' ? 'border-ice/25 bg-ice/[0.05]' : 'border-white/[0.07]'}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1 text-ink-mute">{m.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}{m.dir === 'up' ? 'Crew → Ground' : 'Ground → Crew'} · D{m.day}</span>
                    <span className={arrived ? 'text-ok' : 'text-warn'}>{arrived ? (m.dir === 'up' ? 'Delivered' : 'Received') : `in transit · ${fmtDelay(Math.round(eta))} left`}</span>
                  </div>
                  <div className={`mt-1 ${arrived || m.dir === 'up' ? 'text-ink' : 'text-ink-mute italic'}`}>{arrived || m.dir === 'up' ? m.text : 'Reply on its way…'}</div>
                </li>
              )
            })}
          </ul>
        </Panel>
        <Panel title="When does HALO act on its own?" kicker="Autonomy policy (illustrative)">
          <ol className="space-y-2 text-sm">
            {[
              { m: 'linked', t: '≤ 3 s · Ground-linked', d: 'Report to ground and follow their call. Example: ISS.' },
              { m: 'delayed', t: '3 s – 5 min · Delayed assist', d: 'Start the protocol, report, and adjust when ground replies. Example: Moon, HERA analog.' },
              { m: 'autonomous', t: '≥ 5 min · Autonomous', d: 'HALO runs the protocol now, queues the packet, and escalates only what needs a human. Example: Mars transit.' },
            ].map((x) => (
              <li key={x.m} className={`rounded-xl border p-3 ${h.autonomy === x.m ? 'border-teal/50 bg-teal/[0.06]' : 'border-white/[0.07]'}`}><div className="font-medium">{x.t}</div><div className="text-xs text-ink-soft">{x.d}</div></li>
            ))}
          </ol>
          <div className="mt-3 space-y-1.5"><FactLine id="marsDelay" compact /><FactLine id="moonLatency" compact /><FactLine id="heraDelay" compact /><FactLine id="telesurgery" compact /></div>
          <div className="mt-3"><Seg label="Try another environment" size="sm" value={h.env} onChange={(v) => h.set('env', v)} options={ENVIRONMENTS.map((e) => ({ v: e.id, label: `${e.short} · ${autonomyFor(e.delayAt(h.day)) === 'autonomous' ? 'auto' : fmtDelay(e.delayAt(h.day))}` }))} /></div>
          <div className="mt-2 text-[11px] text-ink-mute">Mars delay in this demo grows along an illustrative curve to ~20 min by day 180.</div>
        </Panel>
      </div>
    </div>
  )
}

function LinkAnim({ delay, packets }: { delay: number; packets: { id: string; dir: 'up' | 'down'; p: number }[] }) {
  const x0 = 90, x1 = 710, y = 90
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (document.documentElement.classList.contains('reduce') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const loop = (t: number) => { setTick(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  const tele = [0, 0.33, 0.66].map((o, k) => ({ k, p: ((tick / 5200) + o) % 1, dir: k === 1 ? 'down' : 'up' as const }))
  const pathY = (t: number) => y - Math.sin(Math.PI * t) * 40
  return (
    <svg viewBox="0 0 800 180" className="w-full" role="img" aria-label={`Signal path between spacecraft and Earth with ${packets.length} packets in flight`}>
      <defs>
        <radialGradient id="earth" cx="40%" cy="35%"><stop offset="0" stopColor="#60A5FA" /><stop offset="1" stopColor="#1e3a8a" /></radialGradient>
        <radialGradient id="glowE"><stop offset="0" stopColor="#60A5FA" stopOpacity=".35" /><stop offset="1" stopColor="#60A5FA" stopOpacity="0" /></radialGradient>
      </defs>
      {Array.from({ length: 40 }, (_, k) => <circle key={k} cx={(k * 137) % 800} cy={(k * 71) % 180} r={k % 5 === 0 ? 1.2 : 0.7} fill="#fff" opacity={0.25} />)}
      <path d={`M${x0},${y} Q400,${y - 80} ${x1},${y}`} stroke="#60A5FA" strokeOpacity=".35" strokeWidth="1.5" fill="none" className="signal-dash" />
      <circle cx={x1} cy={y} r="56" fill="url(#glowE)" />
      <circle cx={x1} cy={y} r="32" fill="url(#earth)" />
      <path d={`M${x1 - 20},${y - 10} q10,-8 18,0 q6,10 -4,14 q-10,2 -14,-14z`} fill="#34D399" opacity=".55" />
      <text x={x1} y={y + 54} textAnchor="middle" fontSize="12" fill="#A9B6CC">Earth · Flight surgeon</text>
      <g transform={`translate(${x0},${y})`}>
        <rect x="-18" y="-10" width="36" height="20" rx="6" fill="#141D31" stroke="#2DD4BF" />
        <rect x="-44" y="-6" width="22" height="12" fill="#1C2840" stroke="#2DD4BF" strokeOpacity=".6" />
        <rect x="22" y="-6" width="22" height="12" fill="#1C2840" stroke="#2DD4BF" strokeOpacity=".6" />
        <circle r="3" fill="#2DD4BF" />
      </g>
      <text x={x0} y={y + 34} textAnchor="middle" fontSize="12" fill="#A9B6CC">Spacecraft · HALO</text>
      <text x="400" y="26" textAnchor="middle" fontSize="13" fill="#E6EDF7" className="num">{fmtDelay(delay)} one-way</text>
      {tele.map((pk) => {
        const t = pk.dir === 'up' ? pk.p : 1 - pk.p
        return <circle key={'t' + pk.k} cx={x0 + (x1 - x0) * t} cy={pathY(t)} r="2.4" fill={pk.dir === 'up' ? '#2DD4BF' : '#60A5FA'} opacity={0.75} />
      })}
      {packets.map((pk) => {
        const t = pk.dir === 'up' ? pk.p : 1 - pk.p
        const cx = x0 + (x1 - x0) * t, cy = pathY(t)
        return <g key={pk.id}><circle cx={cx} cy={cy} r="9" fill={pk.dir === 'up' ? '#2DD4BF' : '#60A5FA'} opacity=".25" /><circle cx={cx} cy={cy} r="4.5" fill={pk.dir === 'up' ? '#2DD4BF' : '#60A5FA'} /></g>
      })}
    </svg>
  )
}
