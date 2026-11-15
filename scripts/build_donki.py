"""Trim the raw NASA CCMC DONKI exports in data/raw/ into src/data/donki.json.
No events are added or invented: every record maps 1:1 to a DONKI record and keeps its DONKI link.
Usage: python3 scripts/build_donki.py data/raw src/data/donki.json
"""
import json, sys, os, glob

raw_dir, out = sys.argv[1], sys.argv[2]
def load(prefix):
    (p,) = glob.glob(os.path.join(raw_dir, prefix + '*.json'))
    return json.load(open(p))

def ids(lst):
    return [e['activityID'] for e in (lst or [])]

def trim(s, n=320):
    s = (s or '').replace('\n', ' ').strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + '…'

flr = [dict(id=f['flrID'], cls=f['classType'], begin=f['beginTime'], peak=f['peakTime'], end=f['endTime'],
            loc=f['sourceLocation'], ar=f['activeRegionNum'], note=trim(f['note']), link=f['link'],
            linked=ids(f['linkedEvents']), instruments=[i['displayName'] for i in f['instruments'] or []])
       for f in load('donki-flr')]

cme = []
for c in load('donki-cme'):
    best = [a for a in (c.get('cmeAnalyses') or []) if a.get('isMostAccurate')]
    speed = max([a['speed'] for a in best if a.get('speed')] or [0]) or None
    mars, earth = set(), set()
    for a in best:
        for e in a.get('enlilList') or []:
            if e.get('estimatedShockArrivalTime'): earth.add(e['estimatedShockArrivalTime'])
            for im in e.get('impactList') or []:
                if im.get('location') == 'Mars': mars.add(im['arrivalTime'])
    cme.append(dict(id=c['activityID'], start=c['startTime'], loc=c['sourceLocation'] or None, ar=c['activeRegionNum'],
                    speed=speed, type=(best[0].get('type') if best else None), halfAngle=(best[0].get('halfAngle') if best else None),
                    note=trim(c['note']), link=c['link'], linked=ids(c['linkedEvents']),
                    marsArrivals=sorted(mars), earthArrivals=sorted(earth)))

sep = [dict(id=s['sepID'], time=s['eventTime'], instruments=[i['displayName'] for i in s['instruments'] or []],
            link=s['link'], linked=ids(s['linkedEvents'])) for s in load('donki-sep')]

meta = dict(source='NASA Community Coordinated Modeling Center (CCMC), DONKI',
            api='https://ccmc.gsfc.nasa.gov/DONKI-API/get/', ui='https://ccmc.gsfc.nasa.gov/DONKI/',
            counts=dict(flr=len(flr), cme=len(cme), sep=len(sep)),
            coverage=dict(flr=[flr[0]['begin'], flr[-1]['begin']], cme=[cme[0]['start'], cme[-1]['start']], sep=[sep[0]['time'], sep[-1]['time']]))
json.dump(dict(meta=meta, flr=flr, cme=cme, sep=sep), open(out, 'w'), separators=(',', ':'))
print(json.dumps(meta, indent=1), os.path.getsize(out), 'bytes')
