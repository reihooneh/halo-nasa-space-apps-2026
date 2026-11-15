import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X } from 'lucide-react'
import { IND } from '../data/domain'
import { SPE_DAY, MISSION_DAYS } from '../sim/mission'
import { useHalo } from '../state/store'
import { parseCommand, VOICE_HELP, type Command } from './parse'

// Minimal typing for the Web Speech recognition API (not in TS DOM lib everywhere).
type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
const RecCtor = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceButton() {
  const h = useHalo()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [reply, setReply] = useState('')
  const rec = useRef<Rec | null>(null)
  const supported = typeof window !== 'undefined' && RecCtor() != null
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])

  const run = (raw: string) => {
    const c = parseCommand(raw)
    const say = (msg: string) => { setReply(msg); h.speak([msg]) }
    if (!c) { say(`Sorry, I didn’t catch a command in “${raw}”. Try “log heart rate 62”.`); return }
    exec(c, say)
  }
  const exec = (c: Command, say: (m: string) => void) => {
    switch (c.type) {
      case 'log': {
        if (c.id === 'sbp' && c.value2 != null) { h.logValue('sbp', c.value); h.logValue('dbp', c.value2); say(`Logged blood pressure ${c.value} over ${c.value2}.`); h.pushToast('Logged by voice', `BP ${c.value}/${c.value2} mmHg`, 'ok'); return }
        h.logValue(c.id, c.value); say(`Logged ${IND[c.id].name.toLowerCase()} ${c.value} ${IND[c.id].unit}.`); h.pushToast('Logged by voice', `${IND[c.id].name}: ${c.value} ${IND[c.id].unit}`, 'ok'); return
      }
      case 'go': h.go(c.view); say(`Opening ${c.view === 'sol' ? 'sol planner' : c.view}.`); return
      case 'play': h.storyFrom(1); say('Playing the Mars transit story.'); return
      case 'pause': h.pause(); say('Paused.'); return
      case 'storm': h.setDay(SPE_DAY); h.go('radiation'); say(`Day ${SPE_DAY}: solar particle event. Shelter protocol is on screen.`); return
      case 'day': h.setDay(Math.max(1, Math.min(MISSION_DAYS, c.day))); say(`Mission day ${Math.max(1, Math.min(MISSION_DAYS, c.day))}.`); return
      case 'read': h.go('triage'); { const t = h.triage; say(t.hits.length ? `${t.hits[0].title}. ${t.hits[0].steps.map((s, i) => `Step ${i + 1}. ${s.text}`).join(' ')}` : 'No protocol is active. Keep the routine.') } return
      case 'help': say('You can say: ' + VOICE_HELP.slice(0, 4).join(', ')); return
    }
  }
  const listen = () => {
    const C = RecCtor()
    if (!C) return
    if (listening) { rec.current?.stop(); return }
    const r = new C()
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1
    r.onresult = (e) => { const t = e.results[0][0].transcript; setText(t); run(t) }
    r.onerror = (e) => { setReply(e.error === 'not-allowed' ? 'Microphone permission was refused. Type the command instead.' : `Voice error: ${e.error}. Type the command instead.`); setListening(false) }
    r.onend = () => setListening(false)
    rec.current = r; setListening(true); r.start()
  }

  return (
    <div className="relative">
      <button className="btn-ghost px-3" aria-expanded={open} aria-label="Voice and typed commands" onClick={() => setOpen((o) => !o)} data-voice-btn><Mic size={15} aria-hidden /></button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-space-900/95 p-3 shadow-2xl backdrop-blur" role="dialog" aria-label="Commands" data-voice>
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Hands-free commands</span><button className="btn-ghost px-1.5 py-1" onClick={() => setOpen(false)} aria-label="Close commands"><X size={14} /></button></div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) run(text.trim()) }}>
            <label htmlFor="cmd" className="sr-only">Command</label>
            <input id="cmd" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Say or type: log heart rate 62" className="focus-ring min-w-0 flex-1 rounded-xl border border-white/10 bg-space-950 px-3 py-2 text-sm" />
            {supported
              ? <button type="button" onClick={listen} className={listening ? 'btn-danger px-3' : 'btn-primary px-3'} aria-label={listening ? 'Stop listening' : 'Speak a command'} aria-pressed={listening}>{listening ? <MicOff size={15} /> : <Mic size={15} />}</button>
              : <button type="submit" className="btn-primary px-3 text-xs">Run</button>}
          </form>
          {listening && <div className="mt-2 flex items-center gap-2 text-xs text-teal" role="status"><span className="h-2 w-2 animate-pulse rounded-full bg-teal" />Listening… speak now</div>}
          {reply && <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2 text-xs text-ink-soft" role="status" data-voice-reply>{reply}</div>}
          <div className="mt-2 text-[11px] text-ink-mute">{supported ? 'Mic uses your browser’s speech service (Chrome sends audio online; typing stays on-device).' : 'Speech recognition is not available in this browser, so type the same commands.'} Press <kbd className="rounded bg-white/10 px-1">/</kbd> to open.</div>
          <ul className="mt-1.5 flex flex-wrap gap-1">{VOICE_HELP.map((v) => <li key={v}><button className="chip border-white/10 text-[10.5px] text-ink-soft hover:text-ink" onClick={() => { const t = v.replace(/[“”]/g, '').replace(/ \(.*\)/, '').split(' / ')[0]; setText(t); run(t) }}>{v}</button></li>)}</ul>
        </div>
      )}
    </div>
  )
}
