// Voice / typed command grammar. Pure and unit-tested; the UI only executes the parsed intent.
import type { IndicatorId } from '../data/domain'
import type { ViewId } from '../state/store'

export type Command =
  | { type: 'log'; id: IndicatorId; value: number; value2?: number }
  | { type: 'go'; view: ViewId }
  | { type: 'play' } | { type: 'pause' } | { type: 'storm' } | { type: 'help' } | { type: 'read' }
  | { type: 'day'; day: number }

const UNITS: Record<string, number> = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

/** Turn "one hundred twenty two point five" into "122.5" inside a phrase. */
export function wordsToNumbers(s: string): string {
  const toks = s.toLowerCase().replace(/-/g, ' ').split(/\s+/)
  const out: string[] = []
  let cur: number | null = null, frac = '', inFrac = false
  const flush = () => { if (cur != null) out.push(String(cur) + (frac ? '.' + frac : '')); cur = null; frac = ''; inFrac = false }
  for (const t of toks) {
    if (inFrac && t in UNITS && UNITS[t] < 10) { frac += String(UNITS[t]); continue }
    if (t === 'point' && cur != null) { inFrac = true; continue }
    if (inFrac) flush()
    if (t in UNITS) { cur = (cur ?? 0) + UNITS[t]; continue }
    if (t in TENS) { cur = (cur ?? 0) + TENS[t]; continue }
    if (t === 'hundred') { cur = (cur ?? 1) * 100; continue }
    if (t === 'and' && cur != null) continue
    flush(); out.push(t)
  }
  flush()
  return out.join(' ')
}

const IND_WORDS: [RegExp, IndicatorId][] = [
  [/\b(heart ?rate|pulse|hr)\b/, 'hr'], [/\b(temp|temperature)\b/, 'temp'], [/\b(glucose|sugar)\b/, 'glucose'],
  [/\bsleep\b/, 'sleep'], [/\bmood\b/, 'mood'], [/\bexercise\b/, 'exercise'], [/\b(reaction|pvt)\b/, 'pvt'],
  [/\bsystolic\b/, 'sbp'], [/\bdiastolic\b/, 'dbp'],
]
const VIEW_WORDS: [RegExp, ViewId][] = [
  [/\b(console|home|dashboard)\b/, 'console'], [/\bbody\b/, 'body'], [/\b(log|measure)\b/, 'log'], [/\bsensors?\b/, 'sensors'],
  [/\b(drift|forecast|insights?)\b/, 'insights'], [/\b(radiation|space weather|dose)\b/, 'radiation'], [/\btriage\b/, 'triage'],
  [/\b(readiness|eva|landing)\b/, 'readiness'], [/\b(sol|circadian|planner)\b/, 'sol'], [/\bground\b/, 'ground'], [/\b(packet|surgeon)\b/, 'packet'],
  [/\bcrew\b/, 'crew'], [/\b(clinical|guidelines?|reference)\b/, 'clinical'], [/\b(lab|simulation)\b/, 'lab'], [/\bblack ?box\b/, 'blackbox'],
  [/\bsources?\b/, 'sources'], [/\bearth\b/, 'earth'], [/\b(limitations|next steps|roadmap)\b/, 'next'],
]

export function parseCommand(raw: string): Command | null {
  const s = wordsToNumbers(raw).toLowerCase().replace(/[.,!?]$/g, '').trim()
  if (!s) return null
  if (/^(help|what can i say)/.test(s)) return { type: 'help' }
  if (/\b(pause|stop)\b/.test(s)) return { type: 'pause' }
  if (/\b(play|start)\b.*\bstory\b|^play$/.test(s)) return { type: 'play' }
  if (/\b(storm|shelter|solar)\b/.test(s)) return { type: 'storm' }
  if (/\bread\b.*\b(protocol|aloud)\b/.test(s)) return { type: 'read' }
  const day = s.match(/\bday (\d{1,3})\b/)
  if (day) return { type: 'day', day: Number(day[1]) }
  if (/^(log|record|enter|add)\b/.test(s)) {
    const bp = s.match(/\b(?:blood pressure|bp)\b\D*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/)
    if (bp) return { type: 'log', id: 'sbp', value: Number(bp[1]), value2: Number(bp[2]) }
    const num = s.match(/(\d+(?:\.\d+)?)/)
    for (const [re, id] of IND_WORDS) if (re.test(s) && num) return { type: 'log', id, value: Number(num[1]) }
    return null
  }
  if (/^(open|go|show|take me)\b/.test(s)) for (const [re, view] of VIEW_WORDS) if (re.test(s)) return { type: 'go', view }
  return null
}

export const VOICE_HELP = ['“Log heart rate 62”', '“Log blood pressure 118 over 76”', '“Log sleep 6.5”', '“Open radiation”', '“Shelter” (jump to the storm)', '“Play story” / “Pause”', '“Day 90”', '“Read protocol”']
