// Chart hover read-out that never covers the chart: values appear in a reserved strip ABOVE the plot,
// instead of a floating box over the data the pointer is on.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Tooltip } from 'recharts'

type Fmt = (label: any, payload: any[]) => string | null // eslint-disable-line @typescript-eslint/no-explicit-any
const Ctx = createContext<(s: string | null) => void>(() => {})

export function ChartFrame({ height, label, hint = 'Point at or tap the chart to read exact values', children }: { height: number; label: string; hint?: string; children: ReactNode }) {
  const [txt, setTxt] = useState<string | null>(null)
  return (
    <div data-chart-frame>
      <div className={`num mb-1 min-h-[20px] text-[11.5px] leading-5 ${txt ? 'text-ink' : 'text-ink-mute'}`} aria-live="polite" data-readout>{txt ?? hint}</div>
      <Ctx.Provider value={setTxt}>
        <div style={{ height }} role="img" aria-label={label}>{children}</div>
      </Ctx.Provider>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Sink({ active, payload, label, fmt }: { active?: boolean; payload?: any[]; label?: any; fmt: Fmt }) {
  const set = useContext(Ctx)
  const s = active && payload && payload.length ? fmt(label, payload) : null
  useEffect(() => { set(s) }, [s, set])
  useEffect(() => () => set(null), [set])
  return null
}

/** Use in place of <Tooltip>: keeps the hover cursor line, sends the values to the strip above the chart. */
export function readout(fmt: Fmt, cursor: object | boolean = { stroke: '#94A3B8', strokeOpacity: 0.35, strokeDasharray: '3 3' }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Tooltip cursor={cursor} isAnimationActive={false} content={(p: any) => <Sink active={p.active} payload={p.payload} label={p.label} fmt={fmt} />} />
}
