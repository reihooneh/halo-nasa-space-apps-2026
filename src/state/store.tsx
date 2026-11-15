import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ENV, IND, INDICATORS, autonomyFor, type EnvId, type HazardId, type IndicatorId } from '../data/domain'
import { simulateMission, idxOf, SPE_DAY, WATCH_DAY, MISSION_DAYS, CREW, SCRIPT, PRE_DAYS, type MissionData } from '../sim/mission'
import { analyzeMission, detections, type Analysis, type DetectionEvent } from '../engine/analysis'
import { runTriage, DEFAULT_MEDKIT, type MedItem, type TriageResult } from '../engine/triage'
import { crewHealthIndex, type Chi } from '../engine/insights'
import type { DriftState } from '../engine/drift'

export type ViewId = 'console' | 'body' | 'log' | 'insights' | 'radiation' | 'ground' | 'triage' | 'packet' | 'crew' | 'lab' | 'blackbox' | 'earth' | 'sources' | 'next' | 'readiness' | 'sensors' | 'sol' | 'clinical'

export interface GroundMsg { id: string; day: number; dir: 'up' | 'down'; text: string; sentAt: number; delaySec: number; kind: 'packet' | 'note' | 'reply' }
export interface A11y { glove: boolean; contrast: boolean; reduce: boolean }
export interface TestResult { day: number; kind: 'pvt' | 'vision' | 'balance'; value: number; detail: string }

interface Persisted {
  env: EnvId
  day: number
  crewId: string
  view: ViewId
  overrides: Record<string, number>
  journal: { day: number; text: string }[]
  messages: GroundMsg[]
  medkit: MedItem[]
  a11y: A11y
  consent: Record<string, boolean>
  tests: TestResult[]
  actions: { day: number; summary: string }[]
  earthMode: boolean
  liveDonki: boolean
  welcomed: boolean
  debriefSeen: boolean
}

export const DEFAULT_DAY = 57
const KEY = 'halo.v1'
const defaults = (): Persisted => ({
  env: 'mars', day: DEFAULT_DAY, crewId: 'leila', view: 'console', overrides: {}, journal: [], medkit: DEFAULT_MEDKIT.map((m) => ({ ...m })),
  a11y: { glove: false, contrast: false, reduce: false }, consent: Object.fromEntries(CREW.map((c) => [c.id, c.consentShare])), tests: [], actions: [], earthMode: false, liveDonki: false,
  welcomed: false, debriefSeen: false, messages: seedMessages(),
})

/** Pre-queued ground traffic so the Ground Link is never empty (sim timestamps). */
function seedMessages(): GroundMsg[] {
  const now = Date.now()
  return [
    { id: 'seed-u1', day: DEFAULT_DAY - 1, dir: 'up', text: `Routine health packet D${DEFAULT_DAY - 1}: sleep drift flagged (day 51), protocol started`, sentAt: now - 3600_000, delaySec: 240, kind: 'packet' },
    { id: 'seed-d1', day: DEFAULT_DAY - 1, dir: 'down', text: 'Flight surgeon: agree with HALO sleep protocol. Keep the light timing and re-test reaction time after two nights.', sentAt: now - 3000_000, delaySec: 600, kind: 'reply' },
  ]
}

/** Simulated pre-flight baseline and weekly vision/balance checks for every crew member (labelled simulated). */
export function simulatedTests(day: number): TestResult[] {
  const out: TestResult[] = [
    { day: -7, kind: 'vision', value: 0, detail: 'line 6 of 8 (pre-flight baseline, simulated)' },
    { day: -7, kind: 'balance', value: 0, detail: 'self-rating 5/5 (pre-flight baseline, simulated)' },
  ]
  for (let d = 7; d <= day; d += 7) {
    out.push({ day: d, kind: 'vision', value: 0, detail: `line 6 of 8 (weekly check D${d}, simulated)` })
    out.push({ day: d, kind: 'balance', value: 0, detail: `self-rating ${d < 14 ? 4 : 5}/5 (weekly check D${d}, simulated)` })
  }
  return out
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    return { ...defaults(), ...JSON.parse(raw) }
  } catch { return defaults() }
}

export interface Derived {
  mission: MissionData
  analysis: Analysis
  detections: DetectionEvent[]
  idx: number
  states: Record<IndicatorId, DriftState>
  latest: Record<IndicatorId, number | null>
  delaySec: number
  autonomy: ReturnType<typeof autonomyFor>
  speActive: boolean
  watchActive: boolean
  triage: TriageResult
  chi: Chi
}

interface Ctx extends Persisted, Derived {
  set: <K extends keyof Persisted>(k: K, v: Persisted[K]) => void
  setDay: (d: number) => void
  go: (v: ViewId) => void
  hazard: HazardId | null
  setHazard: (h: HazardId | null) => void
  playing: boolean
  speed: number
  setSpeed: (s: number) => void
  play: () => void
  pause: () => void
  storyFrom: (d?: number) => void
  judge: boolean
  setJudge: (b: boolean) => void
  logValue: (ind: IndicatorId, v: number, crewId?: string) => void
  addTest: (t: TestResult) => void
  addAction: (summary: string) => void
  sendGround: (text: string, kind?: GroundMsg['kind']) => void
  resetDemo: () => void
  derivedFor: (crewId: string, day: number) => Pick<Derived, 'states' | 'latest' | 'triage' | 'chi'>
  allTests: TestResult[]
  speak: (lines: string[]) => boolean
  stopSpeaking: () => void
  speaking: boolean
  canSpeak: boolean
  t: (key: TermKey) => string
  toast: { id: number; title: string; body: string; tone: 'info' | 'warn' | 'alert' | 'ok' } | null
  pushToast: (title: string, body: string, tone?: 'info' | 'warn' | 'alert' | 'ok') => void
}

/** Earth Mode swaps spaceflight terms for remote-care terms across the app. */
export type TermKey = 'surgeon' | 'ground' | 'crew' | 'astronaut' | 'mission' | 'commander'
const TERMS: Record<TermKey, [string, string]> = {
  surgeon: ['flight surgeon', 'remote specialist'], ground: ['ground', 'specialist'], crew: ['crew', 'team'],
  astronaut: ['astronaut', 'patient'], mission: ['mission', 'deployment'], commander: ['commander', 'station lead'],
}

const C = createContext<Ctx | null>(null)
export const useHalo = () => {
  const c = useContext(C)
  if (!c) throw new Error('HALO context missing')
  return c
}

export function speFor(day: number) { return day === SPE_DAY }
export function watchFor(day: number) { return day >= WATCH_DAY && day < SPE_DAY }

export function HaloProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(load)
  const [hazard, setHazard] = useState<HazardId | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [judge, setJudge] = useState(false)
  const [toast, setToast] = useState<Ctx['toast']>(null)
  const toastSeq = useRef(0)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* storage unavailable */ } }, [p])

  const set = useCallback(<K extends keyof Persisted>(k: K, v: Persisted[K]) => setP((s) => ({ ...s, [k]: v })), [])
  const setDay = useCallback((d: number) => setP((s) => ({ ...s, day: Math.max(1, Math.min(MISSION_DAYS, Math.round(d))) })), [])
  const go = useCallback((v: ViewId) => setP((s) => ({ ...s, view: v })), [])

  const mission = useMemo(() => simulateMission({ seed: 2026 }), [])
  const analysis = useMemo(() => analyzeMission(mission, p.overrides), [mission, p.overrides])
  const dets = useMemo(() => detections(mission, analysis), [mission, analysis])

  const derivedFor = useCallback((crewId: string, day: number) => {
    const idx = idxOf(day)
    const states = {} as Record<IndicatorId, DriftState>
    const latest = {} as Record<IndicatorId, number | null>
    for (const ind of INDICATORS) {
      const r = analysis[crewId][ind.id][idx]
      states[ind.id] = r.state
      latest[ind.id] = r.value
    }
    const delaySec = ENV[p.env].delayAt(day)
    const triage = runTriage({ latest, states, speActive: speFor(day), watchActive: watchFor(day), delaySec, medkit: p.medkit })
    const chi = crewHealthIndex(states, { speActive: speFor(day), urgent: triage.level === 'urgent' })
    return { states, latest, triage, chi }
  }, [analysis, p.env, p.medkit])

  const cur = useMemo(() => derivedFor(p.crewId, p.day), [derivedFor, p.crewId, p.day])
  const delaySec = ENV[p.env].delayAt(p.day)

  const pushToast = useCallback((title: string, body: string, tone: 'info' | 'warn' | 'alert' | 'ok' = 'info') => {
    toastSeq.current += 1
    const id = toastSeq.current
    setToast({ id, title, body, tone })
    window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 4200)
  }, [])

  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; pushToast(d.title, d.body, d.tone) }
    window.addEventListener('halo-toast', on)
    return () => window.removeEventListener('halo-toast', on)
  }, [pushToast])

  // Story playback: ~60 s for 180 days at 1x, with dwell on key beats.
  const beats = useMemo(() => {
    const s = new Set<number>(SCRIPT.map((e) => e.day))
    dets.filter((d) => d.crewId === 'leila').forEach((d) => s.add(d.personalDay))
    return s
  }, [dets])
  useEffect(() => {
    if (!playing) return
    if (p.day >= MISSION_DAYS) { setPlaying(false); setP((s) => ({ ...s, debriefSeen: false, view: 'console' })); pushToast('Mission story complete', 'Day 180 reached. Here is HALO’s mission debrief.', 'ok'); return }
    const base = 235 / speed
    const wait = beats.has(p.day) ? base * 5 : base
    const t = window.setTimeout(() => setP((s) => ({ ...s, day: Math.min(MISSION_DAYS, s.day + 1) })), wait)
    return () => window.clearTimeout(t)
  }, [playing, p.day, speed, beats, pushToast])

  // Toasts for story beats while playing
  useEffect(() => {
    if (!playing) return
    const sc = SCRIPT.find((e) => e.day === p.day)
    if (sc) pushToast(sc.title, sc.detail, sc.kind === 'spe' ? 'alert' : sc.kind === 'spaceweather' || sc.kind === 'fever' ? 'warn' : 'info')
    const d = dets.find((x) => x.crewId === p.crewId && x.personalDay === p.day)
    if (d && !sc) {
      const pop = d.populationDay == null ? 'A fixed population threshold had not flagged it.' : `The population rule would flag it on day ${d.populationDay}.`
      pushToast(`HALO caught ${IND[d.indicator].name.toLowerCase()} drift`, `Persistent change vs. personal baseline on day ${d.personalDay}. ${pop}`, 'warn')
    }
  }, [playing, p.day, p.crewId, dets, pushToast])

  const logValue = useCallback((ind: IndicatorId, v: number, crewId?: string) => {
    setP((s) => ({ ...s, overrides: { ...s.overrides, [`${crewId ?? s.crewId}:${s.day}:${ind}`]: v }, actions: [...s.actions, { day: s.day, summary: `Logged ${IND[ind].name} = ${v} ${IND[ind].unit}` }] }))
  }, [])
  const addTest = useCallback((t: TestResult) => setP((s) => ({ ...s, tests: [...s.tests.filter((x) => !(x.day === t.day && x.kind === t.kind)), t], actions: [...s.actions, { day: s.day, summary: `${t.kind.toUpperCase()} test: ${t.detail}` }] })), [])
  const addAction = useCallback((summary: string) => setP((s) => ({ ...s, actions: [...s.actions, { day: s.day, summary }] })), [])
  const sendGround = useCallback((text: string, kind: GroundMsg['kind'] = 'note') => {
    setP((s) => {
      const d = ENV[s.env].delayAt(s.day)
      const now = Date.now()
      const up: GroundMsg = { id: `u${now}`, day: s.day, dir: 'up', text, sentAt: now, delaySec: d, kind }
      const reply: GroundMsg = { id: `d${now}`, day: s.day, dir: 'down', text: kind === 'packet' ? 'Flight surgeon: packet received. Agree with HALO protocol. Continue and re-measure; we will review trends at next pass.' : 'Ground: message received. Thanks for the update.', sentAt: now, delaySec: d * 2 + 90, kind: 'reply' }
      return { ...s, messages: [...s.messages, up, reply].slice(-40), actions: [...s.actions, { day: s.day, summary: `Queued for downlink: ${text.slice(0, 60)}` }] }
    })
  }, [])
  const resetDemo = useCallback(() => {
    setPlaying(false); setHazard(null); setJudge(false)
    const d = defaults()
    setP(d)
    try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* ignore */ }
  }, [])
  const storyFrom = useCallback((d = 1) => { setP((s) => ({ ...s, day: d, view: 'console', crewId: 'leila', env: 'mars', welcomed: true })); setPlaying(true) }, [])

  // Accessibility classes on <html>
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('glove', p.a11y.glove)
    el.classList.toggle('contrast', p.a11y.contrast)
    el.classList.toggle('reduce', p.a11y.reduce)
  }, [p.a11y])

  const allTests = useMemo(() => [...simulatedTests(p.day), ...p.tests].sort((a, b) => a.day - b.day), [p.day, p.tests])
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance === 'function'
  const [speaking, setSpeaking] = useState(false)
  const speak = useCallback((lines: string[]) => {
    if (!canSpeak) return false
    try {
      window.speechSynthesis.cancel()
      lines.forEach((line, k) => {
        const u = new SpeechSynthesisUtterance(line)
        u.rate = 0.95
        if (k === 0) u.onstart = () => setSpeaking(true)
        if (k === lines.length - 1) { u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false) }
        window.speechSynthesis.speak(u)
      })
      return true
    } catch { setSpeaking(false); return false }
  }, [canSpeak])
  const stopSpeaking = useCallback(() => { try { window.speechSynthesis.cancel() } catch { /* ignore */ } setSpeaking(false) }, [])
  const t = useCallback((k: TermKey) => TERMS[k][p.earthMode ? 1 : 0], [p.earthMode])

  const value: Ctx = {
    ...p, set, setDay, go, hazard, setHazard, playing, speed, setSpeed,
    play: () => { if (p.day >= MISSION_DAYS) setP((s) => ({ ...s, day: 1 })); setPlaying(true) },
    pause: () => setPlaying(false), storyFrom, judge, setJudge,
    logValue, addTest, addAction, sendGround, resetDemo, derivedFor, toast, pushToast, allTests, speak, stopSpeaking, speaking, canSpeak, t,
    mission, analysis, detections: dets, idx: idxOf(p.day), states: cur.states, latest: cur.latest, delaySec, autonomy: autonomyFor(delaySec),
    speActive: speFor(p.day), watchActive: watchFor(p.day), triage: cur.triage, chi: cur.chi,
  }
  return <C.Provider value={value}>{children}</C.Provider>
}

export { PRE_DAYS }
