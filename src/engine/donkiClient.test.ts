import { describe, expect, it } from 'vitest'
import { fetchDonki, flareScore, lastGood, normalise } from './donkiClient'

const res = (body: unknown, status = 200, ct = 'application/json') => ({ ok: status < 400, status, headers: { get: () => ct }, json: async () => body })
const FLR = [{ flrID: '2024-05-14T16:46:00-FLR-001', beginTime: '2024-05-14T16:46Z', classType: 'X8.7', activeRegionNum: 13664, link: 'https://x' }, { flrID: 'b', beginTime: '2024-05-15T01:00Z', classType: 'M4.4' }, { bad: true }]
const CME = [{ activityID: '2024-05-20T05:36:00-CME-001', startTime: '2024-05-20T05:36Z', cmeAnalyses: [{ speed: 2225.4, isMostAccurate: true }] }]
const SEP = [{ sepID: '2024-05-20T06:00:00-SEP-001', eventTime: '2024-05-20T06:00Z' }]
const ok = (u: string) => Promise.resolve(res(u.includes('/FLR') ? FLR : u.includes('/CME') ? CME : SEP))
const noSleep = async () => {}

describe('DONKI client', () => {
  it('validates, labels and drops malformed records', () => {
    const f = normalise('FLR', FLR)
    expect(f.length).toBe(2); expect(f[0].label).toBe('X8.7 flare · AR 13664')
    expect(normalise('CME', CME)[0].label).toBe('CME 2225 km/s')
    expect(() => normalise('SEP', { error: 'x' })).toThrow('not a JSON array')
  })
  it('ranks flare classes', () => { expect(flareScore('X8.7')).toBeGreaterThan(flareScore('X1.0')); expect(flareScore('X1.0')).toBeGreaterThan(flareScore('M9.9')) })
  it('fetches all three kinds in parallel, sorts newest first, finds the largest flare, caches the result', async () => {
    const store = new Map<string, string>(); const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    const r = await fetchDonki({ fetcher: ok, sleep: noSleep, storage, now: new Date('2024-06-01T00:00:00Z') })
    expect(r.counts).toEqual({ FLR: 2, CME: 1, SEP: 1 }); expect(r.largestFlare).toBe('X8.7'); expect(r.source).toBe('ccmc.gsfc.nasa.gov/DONKI-API')
    expect(r.events[0].time >= r.events[1].time).toBe(true)
    expect(lastGood(storage)?.counts.FLR).toBe(2)
  })
  it('retries a flaky request with backoff', async () => {
    let n = 0; const waits: number[] = []
    const flaky = (u: string) => (u.includes('/CME') && n++ < 2 ? Promise.resolve(res({}, 503)) : ok(u))
    const r = await fetchDonki({ fetcher: flaky, sleep: async (ms) => { waits.push(ms) }, storage: null })
    expect(r.counts.CME).toBe(1); expect(waits).toEqual([600, 1200])
  })
  it('falls back to the second NASA endpoint when the first is down', async () => {
    const f = (u: string) => (u.includes('ccmc.gsfc') ? Promise.reject(new TypeError('Failed to fetch')) : ok(u))
    const r = await fetchDonki({ fetcher: f, sleep: noSleep, storage: null })
    expect(r.source).toBe('api.nasa.gov/DONKI'); expect(r.errors[0]).toContain('ccmc')
  })
  it('rejects HTML error pages and reports every failure when all endpoints fail', async () => {
    const f = () => Promise.resolve(res('<html>', 200, 'text/html'))
    await expect(fetchDonki({ fetcher: f, sleep: noSleep, storage: null })).rejects.toThrow(/ccmc.*not JSON.*api.nasa.gov.*not JSON/)
  })
  it('does not retry a 404 (bad request is not transient)', async () => {
    let calls = 0
    const f = () => { calls++; return Promise.resolve(res({}, 404)) }
    await expect(fetchDonki({ fetcher: f, sleep: noSleep, storage: null })).rejects.toThrow()
    expect(calls).toBe(6) // 3 kinds × 2 endpoints, no retries
  })
  it('times out a hanging request', async () => {
    const hang = (_u: string, i?: { signal?: AbortSignal }) => new Promise<never>((_, rej) => i?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    await expect(fetchDonki({ fetcher: hang, sleep: noSleep, storage: null, timeoutMs: 20, retries: 0 })).rejects.toThrow(/timeout/)
  })
})
