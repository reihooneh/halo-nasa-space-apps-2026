import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { HAZ, IND, type IndicatorId } from '../data/domain'
import { useHalo, PRE_DAYS } from '../state/store'
import { DRIFT_PARAMS } from '../engine/drift'
import { confidenceOf } from '../engine/insights'
import { IndicatorChart } from './charts'
import { Illustrative, Prov, StatePill, Simulated } from './kit'

/** F3 "Why flagged?" drawer + F27 confidence panel. */
export function WhyDrawer({ ind, onClose }: { ind: IndicatorId | null; onClose: () => void }) {
  const h = useHalo()
  return (
    <AnimatePresence>
      {ind && (
        <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside role="dialog" aria-modal="true" aria-label={`Why: ${IND[ind].name}`} onClick={(e) => e.stopPropagation()}
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'tween', duration: 0.2 }}
            className="h-full w-full max-w-[560px] overflow-y-auto border-l border-white/10 bg-space-900 p-5 scroll-thin">
            <Body ind={ind} onClose={onClose} h={h} />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({ ind, onClose, h }: { ind: IndicatorId; onClose: () => void; h: ReturnType<typeof useHalo> }) {
  const meta = IND[ind]
  const res = h.analysis[h.crewId][ind]
  const r = res[h.idx]
  const conf = confidenceOf(res, h.idx, PRE_DAYS)
  const crew = h.mission.crew.find((c) => c.id === h.crewId)!
  const dev = r.value != null ? r.value - r.center : null
  const pct = r.value != null ? ((r.value - r.center) / r.center) * 100 : null
  const trend = r.slope7
  const det = h.detections.find((d) => d.crewId === h.crewId && d.indicator === ind && d.personalDay <= h.day && h.day - d.personalDay < 40)
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label">Why is HALO saying this?</div>
          <h2 className="mt-1 text-lg font-semibold">{meta.name} · {crew.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2"><StatePill state={r.state} /><Simulated /><Illustrative /></div>
        </div>
        <button className="btn-ghost px-2" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Cell k="Today" v={r.value != null ? `${r.value} ${meta.unit}` : 'Not logged'} />
        <Cell k="Your baseline" v={`${r.center.toFixed(meta.decimals + 1)} ${meta.unit}`} sub="Pre-flight median, then a slow rolling update on in-range days" />
        <Cell k="Deviation" v={dev != null ? `${dev > 0 ? '+' : ''}${dev.toFixed(meta.decimals + 1)} ${meta.unit} (${pct! > 0 ? '+' : ''}${pct!.toFixed(1)}%)` : '—'} sub={r.z != null ? `robust z = ${r.z.toFixed(2)}` : undefined} />
        <Cell k="7-day trend" v={trend != null ? `${trend > 0 ? '+' : ''}${trend.toFixed(meta.decimals + 2)} ${meta.unit}/day` : '—'} />
        <Cell k="Concerning days in a row" v={`${r.streak} / ${DRIFT_PARAMS.persistDays} needed`} sub="Flags need persistence, so single noisy days are ignored" />
        <Cell k="Population threshold" v={[meta.population.low != null ? `< ${meta.population.low}` : '', meta.population.high != null ? `> ${meta.population.high}` : ''].filter(Boolean).join(' or ') + ` ${meta.unit}`} sub={meta.guideline.kind === 'guideline' ? 'From a published clinical guideline' : 'HALO design value (no guideline exists)'} />
      </div>

      <div className="mt-4 panel p-3"><IndicatorChart res={res} ind={ind} day={h.day} window={60} height={200} /></div>

      {det && (
        <div className="mt-3 rounded-xl border border-warn/30 bg-warn/[0.07] p-3 text-sm">
          HALO first flagged this on <b>day {det.personalDay}</b>. {det.populationDay == null ? 'A fixed population threshold would not have flagged this episode at all.' : `A fixed population threshold would have flagged it on day ${det.populationDay} (${det.leadDays} days later).`}
        </div>
      )}

      <h3 className="label mt-5">Rule applied</h3>
      <p className="mt-1 text-sm text-ink-soft">
        A day is “concerning” when the robust z-score in the concerning direction ({meta.concern === 'both' ? 'either way' : meta.concern === 'low' ? 'lower' : 'higher'}) is ≥ {DRIFT_PARAMS.zWatch}. <b className="text-ink">Drift</b> = {DRIFT_PARAMS.persistDays}+ concerning days in a row. In the first {DRIFT_PARAMS.adaptationDays} days of flight, changes are labelled <i>Adapting</i> and never escalated. Scale uses the median absolute deviation (MAD), so outliers don’t distort your baseline.
      </p>

      <h3 className="label mt-5">Contributing hazards</h3>
      <div className="mt-2 flex flex-wrap gap-2">{meta.hazards.map((hz) => <span key={hz} className="chip" style={{ borderColor: HAZ[hz].color + '55', color: HAZ[hz].color }}>{HAZ[hz].letter} · {HAZ[hz].name}</span>)}</div>
      <p className="mt-2 text-sm text-ink-soft">{meta.why}</p>
      <div className="mt-3 rounded-xl border border-teal/20 bg-teal/[0.05] p-3 text-xs text-ink-soft" data-guideline><div className="label mb-1 text-teal">{meta.guideline.kind === 'guideline' ? 'Clinical reference' : 'Reference note'}</div>{meta.guideline.text}<div className="mt-1.5"><Prov ids={meta.guideline.sources} /></div></div>
      <div className="mt-2"><Prov ids={[...meta.sources, ...meta.hazards.map((x) => HAZ[x].sources[0])]} label="Sources:" /></div>

      <h3 className="label mt-5">Confidence</h3>
      <div className="mt-2 rounded-xl border border-white/10 p-3 text-sm">
        <div className="flex items-center gap-2"><span className={`chip ${conf.level === 'high' ? 'border-ok/40 text-ok' : conf.level === 'medium' ? 'border-warn/40 text-warn' : 'border-alert/40 text-alert'}`}>{conf.level === 'high' ? '●●●' : conf.level === 'medium' ? '●●○' : '●○○'} {conf.level} confidence</span></div>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-soft">{conf.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
        <div className="mt-2 text-xs text-ink-mute"><b className="text-ink-soft">Missing data:</b> {conf.missing} of last {conf.window} days.</div>
        <div className="mt-2 text-xs text-ink-soft"><b>When to escalate to a human:</b> {conf.escalate}</div>
      </div>
    </div>
  )
}

function Cell({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="label">{k}</div>
      <div className="num mt-1 text-[15px] text-ink">{v}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-mute">{sub}</div>}
    </div>
  )
}
