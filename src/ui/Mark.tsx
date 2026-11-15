// Orbital Vitals mark: a heartbeat inside a planet ring, with an orbit and a satellite. Vector copy of the team logo.
// `small` thickens every stroke so the mark stays legible at favicon and header sizes.
import { useId } from 'react'

export function OrbitalMark({ size = 32, small = false, className, title }: { size?: number; small?: boolean; className?: string; title?: string }) {
  const id = useId().replace(/:/g, '')
  const w = small ? { ring: 40, beat: 46, orbit: 30, back: 24, dot: 46 } : { ring: 19, beat: 22, orbit: 9, back: 8, dot: 25 }
  return (
    <svg width={size} height={size} viewBox="554 52 940 940" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`b${id}`} x1="778" x2="1268" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#2DD4BF" /><stop offset="1" stopColor="#5BB0FF" /></linearGradient>
        <linearGradient id={`o${id}`} x1="-480" x2="480" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#2DD4BF" /><stop offset="1" stopColor="#5BB0FF" /></linearGradient>
      </defs>
      <g transform="translate(1024 522) rotate(-23.77)">
        <path d="M -480 0 A 480 161 0 0 1 480 0" fill="none" stroke="#5BB0FF" strokeOpacity="0.42" strokeWidth={w.back} strokeLinecap="round" />
      </g>
      <circle cx="1024" cy="522" r="251" fill="none" stroke="#FFFFFF" strokeWidth={w.ring} />
      <path d="M778 522 H910 L963 410 L1033 662 L1093 458 L1133 522 H1268" fill="none" stroke={`url(#b${id})`} strokeWidth={w.beat} strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(1024 522) rotate(-23.77)">
        <path d="M -480 0 A 480 161 0 0 0 480 0" fill="none" stroke={`url(#o${id})`} strokeWidth={w.orbit} strokeLinecap="round" />
        <circle cx="478" cy="-4" r={w.dot} fill="#FFFFFF" />
      </g>
    </svg>
  )
}

/** HALO product lockup: the team mark + wordmark. */
export function HaloLockup({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <OrbitalMark size={compact ? 30 : 34} small />
      {!compact && <span><span className="block text-[15px] font-bold tracking-[0.18em] text-ink">HALO</span><span className="block text-[10.5px] leading-tight text-ink-mute">by Orbital Vitals</span></span>}
    </span>
  )
}
