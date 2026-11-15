import { CheckCircle2, Circle } from 'lucide-react'
import { Panel } from '../ui/kit'

const BUILT = [
  'Mission Console with Crew Health Index', 'Clickable Body Map (7 systems, 3 explanation levels)', 'Personal-baseline drift engine (robust stats, persistence, unit-tested)', 'One-tap logging with 3-step how-to cards',
  'RIDGE hazard lens across the whole UI', 'Ground Link delay simulator with autonomy modes', 'Deterministic, explainable, medkit-aware triage', 'Flight Surgeon Packet (print / PDF / JSON / downlink)',
  '60-second Mars Transit Story on real NASA DONKI space weather', 'Science & Sources with provenance on every insight', 'Judge Mode guided tour',
  'Reaction-time (PVT-style), near-vision and balance checks', 'Radiation dose ledger, storm shelter protocol and map', '7-day forecast with what-if sliders and time machine',
  'Countermeasure planner and Gravity Debt meter', 'Crew Pulse with consent-based privacy', 'Earth Mode', 'Glove mode, high contrast, reduced motion',
  'Mission Simulation Lab (1,000 seeded missions)', 'Hash-chained Health Black Box', 'Open Synthetic Astronaut Dataset export', 'Silent signals (local only)', 'Confidence panel on every insight',
  'EVA Go/No-Go poll and Landing Readiness with handoff report', 'Camera pulse estimate (on-device, demo-grade)', 'Bluetooth heart-rate strap with HRV', 'Spoken protocols (read aloud)', 'Mission debrief', 'Earth Mode across the whole app',
]
const NEXT = [
  ['Validate on real data', 'Test the drift engine against NASA Standard Measures or analog data (HERA, CHAPEA) in partnership with researchers.'],
  ['Voice commands', 'Hands-free logging by voice (“log heart rate sixty-two”), building on today’s read-aloud protocols.'],
  ['Mars-sol circadian planner', 'Light and sleep scheduling on the 24 h 39 min 35 s sol (NASA: ≈24.6 h) for surface stays.'],
  ['Sensor validation', 'Benchmark the camera pulse estimate against a chest strap across lighting and skin tones.'],
  ['Installable offline app (PWA)', 'Install to tablet; sync packets when a link is available.'],
  ['Clinical review', 'Replace illustrative thresholds with flight-surgeon-approved protocols.'],
]

export function NextView() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Built and verified" kicker="In this prototype">
        <ul className="grid gap-1.5 sm:grid-cols-2">{BUILT.map((b) => <li key={b} className="flex items-start gap-2 text-sm text-ink-soft"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" aria-hidden />{b}</li>)}</ul>
      </Panel>
      <Panel title="Roadmap" kicker="Not shown in the app until verified">
        <ul className="space-y-2">{NEXT.map(([t, d]) => <li key={t} className="flex gap-2 rounded-xl border border-white/[0.06] p-3"><Circle size={14} className="mt-1 shrink-0 text-ink-mute" aria-hidden /><div><div className="text-sm font-medium">{t}</div><div className="text-xs text-ink-soft">{d}</div></div></li>)}</ul>
      </Panel>
    </div>
  )
}
