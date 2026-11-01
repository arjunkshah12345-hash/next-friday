"""Runs the five Python parsers over the answer key.  TZ=UTC .venv/bin/python run_py.py  -> out/py.json
Same rules as run-js.mjs: each library's main entry point, default settings, and "now" passed where the API takes it."""
import datetime as dt, json, os, statistics, sys, time, warnings, logging
from importlib.metadata import version
warnings.filterwarnings('ignore'); logging.disable(logging.CRITICAL)
assert os.environ.get('TZ') == 'UTC', 'run with TZ=UTC'
time.tzset()

HERE = os.path.dirname(os.path.abspath(__file__))
key = json.load(open(os.path.join(HERE, 'out', 'cases.json')))
REF = dt.datetime(2026, 10, 28, 14, 30)        # naive, UTC
TODAY = REF.date()

def fmt(x):
    if x is None: return None
    if isinstance(x, dt.datetime): return x.strftime('%Y-%m-%dT%H:%M')
    if isinstance(x, dt.date): return x.strftime('%Y-%m-%dT00:00')
    if isinstance(x, dt.time): return f'{TODAY.isoformat()}T{x.strftime("%H:%M")}'
    if isinstance(x, dt.timedelta): return (REF + x).strftime('%Y-%m-%dT%H:%M')
    return None

import dateparser
def p_dateparser(t): return fmt(dateparser.parse(t, settings={'RELATIVE_BASE': REF}))

import parsedatetime
CAL = parsedatetime.Calendar()
def p_parsedatetime(t):
    d, status = CAL.parseDT(t, sourceTime=REF)
    return fmt(d) if status else None

from dateutil import parser as du
def p_dateutil(t):
    try: return fmt(du.parse(t, fuzzy=True, default=dt.datetime.combine(TODAY, dt.time())))
    except (ValueError, OverflowError, TypeError): return None

from ctparse import ctparse
from ctparse.types import Time, Interval
def p_ctparse(t):
    r = ctparse(t, ts=REF)
    if not r: return None
    x = r.resolution
    if isinstance(x, Interval): x = x.t_from
    if not isinstance(x, Time) or x is None: return None
    if x.year and x.month and x.day:
        return f'{x.year:04d}-{x.month:02d}-{x.day:02d}T{(x.hour or 0):02d}:{(x.minute or 0):02d}'
    if x.hour is not None:
        return f'{TODAY.isoformat()}T{x.hour:02d}:{(x.minute or 0):02d}'
    return None

from timefhuman import timefhuman, tfhConfig
TFH = tfhConfig(now=REF)
def p_timefhuman(t):
    r = timefhuman(t, config=TFH)
    if isinstance(r, list): r = r[0] if r else None
    if isinstance(r, tuple): r = r[0]
    return fmt(r)

ADAPTERS = [
    ('dateparser', 'dateparser', 'dateparser', "dateparser.parse(text, settings={'RELATIVE_BASE': now})", p_dateparser),
    ('parsedatetime', 'parsedatetime', 'parsedatetime', 'Calendar().parseDT(text, sourceTime=now)', p_parsedatetime),
    ('dateutil', 'dateutil', 'python-dateutil', 'parser.parse(text, fuzzy=True)', p_dateutil),
    ('ctparse', 'ctparse', 'ctparse', 'ctparse(text, ts=now)', p_ctparse),
    ('timefhuman', 'timefhuman', 'timefhuman', 'timefhuman(text, config=tfhConfig(now=now))', p_timefhuman),
]

def safe(f, t):
    try: return f(t)
    except Exception: return None

out = []
for pid, name, pkg, call, f in ADAPTERS:
    answers = [safe(f, c['text']) for c in key]
    for _ in range(2):
        for c in key: safe(f, c['text'])
    per = []
    for c in key:
        ts = []
        for _ in range(7):
            t0 = time.perf_counter_ns(); safe(f, c['text']); ts.append((time.perf_counter_ns() - t0) / 1000)
        per.append(sorted(ts)[3])
    out.append({'id': pid, 'name': name, 'lang': 'Python', 'pkg': pkg, 'version': version(pkg), 'call': call,
                'answers': answers, 'us': [round(v, 1) for v in per], 'medianUs': round(statistics.median(per), 1)})
    print(f'{name:18} done  {statistics.median(per):.0f} µs median', flush=True)

json.dump({'python': sys.version.split()[0], 'ranAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'parsers': out},
          open(os.path.join(HERE, 'out', 'py.json'), 'w'), indent=1, ensure_ascii=False)
