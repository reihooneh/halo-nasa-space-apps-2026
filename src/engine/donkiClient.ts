// NASA CCMC DONKI client: the official space-weather database. Built to never break the app:
// parallel requests, per-request timeout, retries with backoff, a second NASA endpoint, strict validation,
// de-duplication, and a last-good cache. If every live path fails, HALO keeps using its bundled real events.

export type DonkiKind = 'FLR' | 'CME' | 'SEP'
export interface DonkiEvent { kind: DonkiKind; id: string; time: string; label: string; link?: string }
export interface DonkiResult { events: DonkiEvent[]; counts: Record<DonkiKind, number>; source: string; fetchedAt: string; largestFlare: string | null; tries: number; errors: string[] }

export const ENDPOINTS = [
  { name: 'ccmc.gsfc.nasa.gov/DONKI-API', url: (k: DonkiKind, q: string) => `https://ccmc.gsfc.nasa.gov/DONKI-API/get/${k}?${q}` },
  { name: 'api.nasa.gov/DONKI', url: (k: DonkiKind, q: string) => `https://api.nasa.gov/DONKI/${k}?${q}&api_key=DEMO_KEY` },
]
const CACHE_KEY = 'halo.donki.live.v1'

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0
/** Keep only well-formed records; DONKI fields per kind: flrID/beginTime/classType, activityID/startTime, sepID/eventTime. */
export function normalise(kind: DonkiKind, raw: unknown): DonkiEvent[] {
  if (!Array.isArray(raw)) throw new Error('not a JSON array')
  const out: DonkiEvent[] = []
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue
    if (kind === 'FLR' && isStr(r.flrID) && isStr(r.beginTime)) out.push({ kind, id: r.flrID, time: r.beginTime, label: `${isStr(r.classType) ? r.classType : '?'} flare${r.activeRegionNum ? ` · AR ${r.activeRegionNum}` : ''}`, link: isStr(r.link) ? r.link : undefined })
    else if (kind === 'CME' && isStr(r.activityID) && isStr(r.startTime)) {
      const an = Array.isArray(r.cmeAnalyses) ? (r.cmeAnalyses as Record<string, unknown>[]).find((a) => a && a.isMostAccurate) ?? (r.cmeAnalyses as Record<string, unknown>[])[0] : null
      out.push({ kind, id: r.activityID, time: r.startTime, label: `CME${an && typeof an.speed === 'number' ? ` ${Math.round(an.speed)} km/s` : ''}`, link: isStr(r.link) ? r.link : undefined })
    } else if (kind === 'SEP' && isStr(r.sepID) && isStr(r.eventTime)) out.push({ kind, id: r.sepID, time: r.eventTime, label: 'Solar energetic particle event', link: isStr(r.link) ? r.link : undefined })
  }
  return out
}

const FLARE_RANK: Record<string, number> = { A: 0, B: 1, C: 2, M: 3, X: 4 }
export function flareScore(cls: string): number { const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(cls); return m ? FLARE_RANK[m[1]] * 100 + Number(m[2]) : -1 }

type Fetch = (u: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; headers: { get(n: string): string | null }; json(): Promise<unknown> }>

async function getJson(fetcher: Fetch, url: string, timeoutMs: number): Promise<unknown> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetcher(url, { signal: ctl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('json')) throw new Error('not JSON')
    return await r.json()
  } catch (e) {
    throw new Error((e as Error).name === 'AbortError' ? 'timeout' : (e as Error).message || 'network/CORS')
  } finally { clearTimeout(t) }
}

export interface FetchOpts { days?: number; now?: Date; timeoutMs?: number; retries?: number; backoffMs?: number; fetcher?: Fetch; sleep?: (ms: number) => Promise<void>; storage?: Pick<Storage, 'getItem' | 'setItem'> | null }

/** Fetch the last `days` of flares, CMEs and SEP events. Tries each endpoint in turn; within one, retries with backoff. */
export async function fetchDonki(o: FetchOpts = {}): Promise<DonkiResult> {
  const { days = 30, now = new Date(), timeoutMs = 8000, retries = 2, backoffMs = 600 } = o
  const fetcher = o.fetcher ?? ((u, i) => fetch(u, i) as ReturnType<Fetch>)
  const sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const start = new Date(now.getTime() - days * 86400000)
  const q = `startDate=${start.toISOString().slice(0, 10)}&endDate=${now.toISOString().slice(0, 10)}`
  const kinds: DonkiKind[] = ['FLR', 'CME', 'SEP']
  const errors: string[] = []
  let tries = 0
  for (const ep of ENDPOINTS) {
    try {
      const lists = await Promise.all(kinds.map(async (k) => {
        for (let a = 0; ; a++) {
          tries++
          try { return normalise(k, await getJson(fetcher, ep.url(k, q), timeoutMs)) } catch (e) {
            const msg = (e as Error).message
            if (a >= retries || /HTTP 4(0[0-9]|1[0-9])/.test(msg) && !/HTTP 429/.test(msg)) throw new Error(`${k}: ${msg}`)
            await sleep(backoffMs * 2 ** a)
          }
        }
      }))
      const seen = new Set<string>(), events: DonkiEvent[] = []
      for (const e of lists.flat()) if (!seen.has(e.id)) { seen.add(e.id); events.push(e) }
      events.sort((a, b) => b.time.localeCompare(a.time))
      const flares = events.filter((e) => e.kind === 'FLR').map((e) => e.label.split(' ')[0]).sort((a, b) => flareScore(b) - flareScore(a))
      const res: DonkiResult = { events, counts: { FLR: lists[0].length, CME: lists[1].length, SEP: lists[2].length }, source: ep.name, fetchedAt: now.toISOString(), largestFlare: flares[0] ?? null, tries, errors }
      try { o.storage?.setItem(CACHE_KEY, JSON.stringify(res)) } catch { /* storage may be blocked */ }
      return res
    } catch (e) { errors.push(`${ep.name}: ${(e as Error).message}`) }
  }
  const err = new Error(errors.join(' · ')) as Error & { tries: number }
  err.tries = tries
  throw err
}

/** Last successful live result, if this browser has one. */
export function lastGood(storage: Pick<Storage, 'getItem'> | null | undefined): DonkiResult | null {
  try { const s = storage?.getItem(CACHE_KEY); const r = s ? JSON.parse(s) : null; return r && Array.isArray(r.events) ? r : null } catch { return null }
}
