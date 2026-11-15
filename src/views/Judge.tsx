import { useEffect, useLayoutEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useHalo, type ViewId } from '../state/store'
import { Kbd } from '../ui/kit'

interface Step { view: ViewId; target: string; criterion: string; title: string; body: string; day?: number }
const STEPS: Step[] = [
  { view: 'console', target: 'hero', criterion: 'Impact · Presentation', title: 'The problem, in one screen', body: 'On a Mars mission the flight surgeon can be ~20 minutes away (NASA). HALO is the crew’s on-board health copilot: personal baseline, early drift, NASA hazard context, and a clear next action.', day: 57 },
  { view: 'console', target: 'cards', criterion: 'Creativity', title: 'Your normal, not the average', body: 'Spaceflight shifts everyone’s physiology, so population averages mislead. Every card compares today with this astronaut’s own baseline. Here, sleep drift was caught on day 51, eight days before the fixed guideline rule (AASM: 6 h or fewer is inadequate) would fire on day 59. Each card also shows the guideline category (AHA, CDC, ADA, AASM).' },
  { view: 'insights', target: 'forecast', criterion: 'Validity', title: 'Explainable statistics', body: 'Robust median/MAD baseline, persistence rule (3 days) to suppress noise, adaptation window, 7-day forecast with an uncertainty band, and “if nothing changes” vs “with countermeasure”. Engine and rules are unit-tested; thresholds are labelled illustrative.' },
  { view: 'radiation', target: 'storm', criterion: 'Relevance · NASA data', title: 'Real NASA space weather drives the story', body: 'The scenario replays real NASA CCMC DONKI records: the X8.7 flare (14 May 2024) and the 2,678 km/s far-side CME (20 May 2024) that NASA measured at Mars. Dose is checked against NASA-STD-3001 limits.', day: 90 },
  { view: 'ground', target: 'groundlink', criterion: 'Creativity · Impact', title: 'Autonomy that scales with distance', body: 'As the signal delay grows, HALO shifts from “report to ground” to “act now, then report”. Packets travel with the true delay (shown sped up).' },
  { view: 'triage', target: 'triage', criterion: 'Validity · Usability', title: 'Deterministic, offline triage', body: 'Not a chatbot: a rule tree you can read. Every step says why, uses only what is in the medkit, and warns about scarce supplies. Here: fever on day 157 with ground about 17 minutes away.', day: 157 },
  { view: 'readiness', target: 'eva', criterion: 'Best Mission Concept', title: 'EVA Go/No-Go and Landing Readiness', body: 'A mission-control style poll per body system, built from the same drift states, plus a landing-readiness score and a return-to-Earth handoff report.', day: 157 },
  { view: 'lab', target: 'lab', criterion: 'Validity · Best Use of Science', title: '1,000 simulated missions', body: 'Personal-baseline detection vs a fixed threshold: more true declines caught, typically days earlier, with assumptions on screen. Labelled as sensitivity under stated assumptions, not proof.' },
  { view: 'blackbox', target: 'blackbox', criterion: 'Validity · Trust', title: 'Tamper-evident Health Black Box', body: 'Every reading, flag and decision is SHA-256 hash-chained. Try the tamper test: edit one entry and the chain breaks.' },
  { view: 'earth', target: 'earth', criterion: 'Impact · Galactic & Local Impact', title: 'Earth Mode', body: 'The same engine serves Antarctic stations, remote and outback communities and under-resourced clinics, anywhere the expert is far away.' },
  { view: 'sources', target: 'sources', criterion: 'Relevance · Validity', title: 'Provenance everywhere', body: 'Every number is tied to a NASA or CSA source (official challenge resources marked). Clear disclaimer: simulated data, not a medical device. Exportable synthetic dataset.' },
  { view: 'console', target: 'play', criterion: 'Presentation', title: 'Watch it work in 60 seconds', body: 'Press “Play Mars Transit Story”: adaptation, sleep drift caught early, space-weather watch, solar storm shelter, morale lull, exercise slip, and autonomous fever triage, from day 1 to 180.' },
]

export function JudgeTour() {
  const h = useHalo()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const s = STEPS[i]
  useEffect(() => { h.pause(); }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { h.go(s.view); if (s.day) h.setDay(s.day) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    let raf = 0, tries = 0
    const find = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'auto' }); window.setTimeout(() => setRect(el.getBoundingClientRect()), 60) }
      else if (tries++ < 30) raf = requestAnimationFrame(find)
      else setRect(null)
    }
    setRect(null); raf = requestAnimationFrame(find)
    const onR = () => { const el = document.querySelector(`[data-tour="${s.target}"]`); if (el) setRect(el.getBoundingClientRect()) }
    window.addEventListener('resize', onR); window.addEventListener('scroll', onR, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); window.removeEventListener('scroll', onR, true) }
  }, [i, s.target])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') h.setJudge(false)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); i < STEPS.length - 1 ? setI(i + 1) : h.setJudge(false) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setI(Math.max(0, i - 1)) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [i, h])
  const pad = 8
  const cardTop = rect ? (rect.bottom + 16 + 240 < window.innerHeight ? rect.bottom + 16 : Math.max(16, rect.top - 256)) : window.innerHeight / 2 - 120
  const cardLeft = rect ? Math.min(Math.max(16, rect.left), window.innerWidth - 456) : window.innerWidth / 2 - 220
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Judge Mode guided tour" data-judge>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs><mask id="hole"><rect width="100%" height="100%" fill="white" />{rect && <rect x={rect.left - pad} y={rect.top - pad} width={rect.width + pad * 2} height={rect.height + pad * 2} rx="18" fill="black" />}</mask></defs>
        <rect width="100%" height="100%" fill="rgba(3,6,12,0.72)" mask="url(#hole)" />
        {rect && <rect x={rect.left - pad} y={rect.top - pad} width={rect.width + pad * 2} height={rect.height + pad * 2} rx="18" fill="none" stroke="#2DD4BF" strokeWidth="2" />}
      </svg>
      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel-raised absolute w-[440px] max-w-[calc(100vw-32px)] p-5 shadow-2xl" style={{ top: cardTop, left: cardLeft }}>
        <div className="flex items-center justify-between"><span className="chip border-teal/40 bg-teal/10 text-teal">{s.criterion}</span><button className="btn-ghost px-2 py-1" onClick={() => h.setJudge(false)} aria-label="Close tour"><X size={14} /></button></div>
        <h2 className="mt-3 text-lg font-semibold">{s.title}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="num text-xs text-ink-mute">{i + 1} / {STEPS.length} · <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>Esc</Kbd></span>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><ArrowLeft size={14} /> Back</button>
            {i < STEPS.length - 1 ? <button className="btn-primary" onClick={() => setI(i + 1)} autoFocus>Next <ArrowRight size={14} /></button>
              : <button className="btn-primary" onClick={() => { h.setJudge(false); h.storyFrom(1) }} autoFocus>Play the story</button>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
