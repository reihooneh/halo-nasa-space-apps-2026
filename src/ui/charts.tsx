import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, CartesianGrid } from 'recharts'
import { IND, type IndicatorId } from '../data/domain'
import type { DayResult } from '../engine/drift'
import { dayOfIdx, idxOf } from '../sim/mission'
import { STATE_META } from './kit'

export function IndicatorChart({ res, ind, day, window = 60, height = 220, showPop = true, markers = [] }: { res: DayResult[]; ind: IndicatorId; day: number; window?: number; height?: number; showPop?: boolean; markers?: { day: number; label: string; color: string }[] }) {
  const i1 = idxOf(day)
  const i0 = Math.max(0, i1 - window + 1)
  const meta = IND[ind]
  const data = res.slice(i0, i1 + 1).map((r) => ({
    day: dayOfIdx(r.index),
    v: r.value,
    band: [Number((r.center - 2 * r.scale).toFixed(2)), Number((r.center + 2 * r.scale).toFixed(2))] as [number, number],
    c: Number(r.center.toFixed(2)),
    flag: r.state === 'drift' || r.state === 'watch' ? r.value : null,
    state: r.state,
  }))
  const pop = meta.population
  return (
    <div style={{ height }} role="img" aria-label={`${meta.name} over the last ${window} days with personal baseline band`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 18, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} tickFormatter={(d) => (d <= 0 ? `pre ${d}` : `D${d}`)} />
          <YAxis tick={{ fill: '#7D8BA5', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} />
          <Tooltip
            contentStyle={{ background: '#0F1626', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
            labelFormatter={(d) => `Mission day ${d}`}
            formatter={(val: any, name: any) => {
              if (name === 'band') return [`${val[0]} – ${val[1]} ${meta.unit}`, 'Personal range (±2 robust SD)']
              if (name === 'c') return [`${val} ${meta.unit}`, 'Personal baseline']
              if (name === 'v') return [`${val} ${meta.unit}`, meta.short]
              return [null, null]
            }}
          />
          <Area dataKey="band" stroke="none" fill="#2DD4BF" fillOpacity={0.09} isAnimationActive={false} />
          <Line dataKey="c" stroke="#2DD4BF" strokeOpacity={0.6} strokeDasharray="4 4" dot={false} strokeWidth={1.2} isAnimationActive={false} />
          {showPop && pop.low != null && <ReferenceLine y={pop.low} stroke="#A9B6CC" strokeOpacity={0.45} strokeDasharray="2 6" label={{ value: `population ${pop.low}`, fill: '#A9B6CC', fontSize: 10, position: 'insideBottomRight' }} />}
          {showPop && pop.high != null && <ReferenceLine y={pop.high} stroke="#A9B6CC" strokeOpacity={0.45} strokeDasharray="2 6" label={{ value: `population ${pop.high}`, fill: '#A9B6CC', fontSize: 10, position: 'insideTopRight' }} />}
          {markers.filter((m) => m.day >= dayOfIdx(i0) && m.day <= day).map((m) => (
            <ReferenceLine key={m.day + m.label} x={m.day} stroke={m.color} strokeOpacity={0.7} label={{ value: m.label, fill: m.color, fontSize: 10, position: 'insideTopLeft' }} />
          ))}
          <Line dataKey="v" stroke="#E6EDF7" strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false} />
          <Scatter dataKey="flag" isAnimationActive={false} shape={(p: any) => {
            if (p.payload.flag == null) return <g />
            const col = STATE_META[p.payload.state as keyof typeof STATE_META].color
            return p.payload.state === 'drift'
              ? <path d={`M${p.cx},${p.cy - 5} L${p.cx + 5},${p.cy + 4} L${p.cx - 5},${p.cy + 4} Z`} fill={col} />
              : <circle cx={p.cx} cy={p.cy} r={3.5} fill="none" stroke={col} strokeWidth={1.6} />
          }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Spark({ res, day, color = '#E6EDF7', n = 21 }: { res: DayResult[]; day: number; color?: string; n?: number }) {
  const i1 = idxOf(day)
  const pts = res.slice(Math.max(0, i1 - n + 1), i1 + 1)
  const vals = pts.map((r) => r.value).filter((v): v is number => v != null)
  if (vals.length < 2) return <svg width="100%" height="28" aria-hidden />
  const lo = Math.min(...vals, pts[pts.length - 1].center - 2 * pts[pts.length - 1].scale)
  const hi = Math.max(...vals, pts[pts.length - 1].center + 2 * pts[pts.length - 1].scale)
  const W = 120, H = 28
  const x = (k: number) => (k / (pts.length - 1)) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * (H - 4) - 2
  let d = ''
  pts.forEach((r, k) => { if (r.value != null) d += `${d && pts[k - 1]?.value != null ? 'L' : 'M'}${x(k).toFixed(1)},${y(r.value).toFixed(1)}` })
  const c = pts[pts.length - 1].center, s = pts[pts.length - 1].scale
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden>
      <rect x={0} y={y(c + 2 * s)} width={W} height={Math.max(1, y(c - 2 * s) - y(c + 2 * s))} fill="#2DD4BF" opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
