import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, Eye, Info, MinusCircle, Waves } from 'lucide-react'
import { FACTS, SOURCES } from '../data/sources'
import type { DriftState } from '../engine/drift'
import type { Level } from '../engine/triage'

export function Panel({ title, kicker, right, children, className = '', tour, id }: { title?: ReactNode; kicker?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; tour?: string; id?: string }) {
  return (
    <section className={`panel p-4 md:p-5 ${className}`} data-tour={tour} id={id} aria-label={typeof title === 'string' ? title : undefined}>
      {(title || right || kicker) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-[min(100%,300px)] flex-1">
            {kicker && <div className="label mb-1">{kicker}</div>}
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
          </div>
          {right && <div className="flex max-w-full flex-wrap items-center justify-end gap-2">{right}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export const STATE_META: Record<DriftState, { label: string; color: string; Icon: typeof Info; text: string }> = {
  ok: { label: 'In range', color: '#34D399', Icon: CheckCircle2, text: 'text-ok' },
  watch: { label: 'Watch', color: '#F59E0B', Icon: Eye, text: 'text-warn' },
  drift: { label: 'Drift', color: '#F43F5E', Icon: AlertTriangle, text: 'text-alert' },
  adapt: { label: 'Adapting', color: '#60A5FA', Icon: Waves, text: 'text-ice' },
  nodata: { label: 'Not logged', color: '#7D8BA5', Icon: CircleDashed, text: 'text-ink-mute' },
}

/** Status is never conveyed by colour alone: icon + text label always. */
export function StatePill({ state, small }: { state: DriftState; small?: boolean }) {
  const m = STATE_META[state]
  return (
    <span className={`chip ${small ? 'px-2 py-0.5 text-[11px]' : ''}`} style={{ borderColor: m.color + '55', color: m.color, background: m.color + '14' }}>
      <m.Icon size={small ? 12 : 14} aria-hidden /> {m.label}
    </span>
  )
}

export const LEVEL_META: Record<Level, { label: string; color: string; Icon: typeof Info }> = {
  self: { label: 'Self-manage', color: '#34D399', Icon: CheckCircle2 },
  monitor: { label: 'Monitor', color: '#F59E0B', Icon: Eye },
  urgent: { label: 'Urgent', color: '#F43F5E', Icon: AlertTriangle },
}
export function LevelPill({ level, big }: { level: Level; big?: boolean }) {
  const m = LEVEL_META[level]
  return (
    <span className={`chip ${big ? 'px-3 py-1.5 text-sm' : ''}`} style={{ borderColor: m.color + '66', color: m.color, background: m.color + '18' }}>
      <m.Icon size={big ? 16 : 14} aria-hidden /> {m.label}
    </span>
  )
}

/** Data provenance badge: which source informed this insight. */
export function Prov({ ids, label }: { ids: string[]; label?: string }) {
  const srcs = ids.map((i) => SOURCES[i]).filter(Boolean)
  if (!srcs.length) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {label && <span className="text-[11px] text-ink-mute">{label}</span>}
      {srcs.map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noreferrer" title={s.title}
          className="focus-ring inline-flex max-w-full items-start gap-1 rounded-md border border-teal/25 bg-teal/[0.07] px-1.5 py-0.5 text-left text-[10.5px] font-medium leading-snug text-teal hover:bg-teal/15">
          <span className="min-w-0 break-words"><span className="whitespace-nowrap">{s.org}</span><span className="text-teal/60"> · </span>{shortTitle(s.title)}</span><ExternalLink size={10} className="mt-[3px] shrink-0" aria-hidden />
        </a>
      ))}
    </span>
  )
}
/** Chip label: the name before the colon (author, organisation or document); the full title is in the tooltip and on Sources. */
export function shortTitle(t: string) {
  const s = t.replace(/^NASA HRP Hazard: /, '').replace(/^NASA HRP: /, '').replace(/^NASA OCHMO Technical Brief: /, '').replace(/^NASA: /, '').replace(/^CSA: /, '').replace(/^NASA CCMC /, '').split(' (')[0]
  const head = s.split(': ')[0]
  return head.length >= 3 && head.length < s.length ? head : s
}

export function Illustrative({ text = 'Illustrative, not medical advice' }: { text?: string }) {
  return <span className="chip border-warn/30 bg-warn/10 px-2 py-0.5 text-[10.5px] text-warn"><Info size={11} aria-hidden />{text}</span>
}
export function Simulated() {
  return <span className="chip border-ice/30 bg-ice/10 px-2 py-0.5 text-[10.5px] text-ice"><MinusCircle size={11} aria-hidden />Simulated crew data</span>
}

export function FactLine({ id, compact }: { id: keyof typeof FACTS | string; compact?: boolean }) {
  const f = FACTS[id]
  if (!f) return null
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className="text-ink-soft">{f.label}:</span>
      <span className="num font-semibold text-ink">{f.value}</span>
      {f.kind === 'illustrative' ? <Illustrative text="Illustrative" /> : <Prov ids={f.sources} />}
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: { v: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} title={o.title} onClick={() => onChange(o.v)}
          className={`focus-ring rounded-[10px] ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-medium transition-colors ${value === o.v ? 'bg-teal/15 text-teal' : 'text-ink-soft hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Metric({ label, value, unit, sub }: { label: ReactNode; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1"><span className="num text-2xl font-semibold text-ink">{value}</span>{unit && <span className="text-sm text-ink-mute">{unit}</span>}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-mute">{sub}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="num rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] text-ink-soft">{children}</kbd>
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="mt-1 text-xs text-ink-mute">{body}</div>
    </div>
  )
}

/** True when HALO runs inside a sandboxed frame (e.g. an embedded preview), where downloads and print are blocked. */
export function isFramed(): boolean {
  try { return window.self !== window.top } catch { return true }
}

export function download(name: string, text: string, type = 'text/plain') {
  if (isFramed()) {
    // Embedded preview: use the host's downloads capability when offered, else copy to clipboard.
    const done = (ok: boolean) => window.dispatchEvent(new CustomEvent('halo-toast', { detail: ok
      ? { title: `Copied ${name} to clipboard`, body: 'Downloads are blocked in this embedded preview. Paste into a file, or open the standalone app to download.', tone: 'info' }
      : { title: 'Download blocked here', body: 'This embedded preview blocks downloads. Open the standalone HALO app to export files.', tone: 'warn' } }))
    const copy = () => { try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)) } catch { done(false) } }
    const host = (window as any).claude
    if (host && typeof host.use === 'function') {
      Promise.resolve(host.use('downloads'))
        .then((d: any) => (d ? d.save({ filename: name, data: text }) : copy()))
        .catch(() => copy())
    } else copy()
    return
  }
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printPage() {
  if (isFramed()) {
    window.dispatchEvent(new CustomEvent('halo-toast', { detail: { title: 'Printing is blocked in this preview', body: 'Open the standalone HALO app to print or save the packet as PDF. JSON export still works (copied to clipboard).', tone: 'warn' } }))
    return
  }
  window.print()
}

import type { HazardId } from '../data/domain'
/** Hazard lens: dim elements unrelated to the active hazard. */
export function lens(active: HazardId | null, hazards: HazardId[]): string {
  if (!active) return ''
  return hazards.includes(active) ? 'ring-1 ring-white/10' : 'opacity-30 saturate-50'
}

import { Volume2, VolumeX } from 'lucide-react'
import { useHalo } from '../state/store'
/** Spoken protocol: reads steps aloud with the browser's speech synthesis; silent, labelled fallback when unavailable. */
export function ReadAloud({ lines, label = 'Read aloud' }: { lines: string[]; label?: string }) {
  const h = useHalo()
  if (!h.canSpeak) return <span className="chip border-white/10 text-ink-mute" title="This browser has no speech synthesis. Steps stay on screen."><VolumeX size={12} aria-hidden /> Voice unavailable</span>
  return h.speaking
    ? <button className="btn-ghost" onClick={h.stopSpeaking} aria-live="polite"><VolumeX size={15} aria-hidden /> Stop reading</button>
    : <button className="btn-ghost" onClick={() => { if (!h.speak(lines)) h.pushToast('Voice unavailable', 'Steps remain on screen.', 'warn') }} data-readaloud><Volume2 size={15} aria-hidden /> {label}</button>
}
