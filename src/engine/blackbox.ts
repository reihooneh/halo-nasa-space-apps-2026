// Health Black Box: append-only, hash-chained log of readings, flags, reasoning and actions.
// Each entry's hash = SHA-256(prevHash + canonical payload). Editing any entry breaks every later link.
import { sha256 } from './sha256'

export interface BBEntryBase { day: number; type: BBType; crewId: string; summary: string; data?: Record<string, unknown> }
export type BBType = 'reading' | 'flag' | 'resolve' | 'triage' | 'spaceweather' | 'shelter' | 'packet' | 'action' | 'user'
export interface BBEntry extends BBEntryBase { seq: number; prev: string; hash: string }

export const GENESIS = '0'.repeat(64)

export function canonical(e: BBEntryBase & { seq: number }): string {
  return JSON.stringify([e.seq, e.day, e.type, e.crewId, e.summary, e.data ?? null])
}

export function chain(entries: BBEntryBase[]): BBEntry[] {
  let prev = GENESIS
  return entries.map((e, seq) => {
    const hash = sha256(prev + canonical({ ...e, seq }))
    const out = { ...e, seq, prev, hash }
    prev = hash
    return out
  })
}

export interface VerifyResult { ok: boolean; brokenAt: number | null; checked: number }
export function verify(entries: BBEntry[]): VerifyResult {
  let prev = GENESIS
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const h = sha256(prev + canonical(e))
    if (e.prev !== prev || h !== e.hash) return { ok: false, brokenAt: i, checked: i + 1 }
    prev = e.hash
  }
  return { ok: true, brokenAt: null, checked: entries.length }
}
