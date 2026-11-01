// Runs the six JavaScript parsers over the answer key.  TZ=UTC node run-js.mjs  → out/js.json
// Each adapter takes a phrase and returns "YYYY-MM-DDTHH:MM" or null, using the library's main
// entry point with its default settings. The only setting we pass is "now", where the API takes one.
// For libraries that read the system clock instead, the clock itself is frozen at the reference time.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { CASES, NOW } from './cases.mjs';
const require = createRequire(import.meta.url);
if (process.env.TZ !== 'UTC') throw new Error('run with TZ=UTC');

/* ---------- freeze the clock ---------- */
const REF = Date.parse(NOW.iso), RealDate = Date;
class FrozenDate extends RealDate { constructor(...a) { super(...(a.length ? a : [REF])); } static now() { return REF; } }
globalThis.Date = FrozenDate;
const ref = () => new RealDate(REF);

const iso = (d) => (d instanceof RealDate && !isNaN(d)) ? d.toISOString().slice(0, 16) : null;
const pkg = (name) => JSON.parse(fs.readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url))).version;

/* ---------- adapters ---------- */
const chrono = require('chrono-node');
const Sugar = require('sugar'); Sugar.Date.setOption('newDateInternal', () => ref());
const anyDate = require('any-date-parser');
const Rec = require('@microsoft/recognizers-text-date-time');
const datejs = require('date.js');
const nlp = require('compromise').extend(require('compromise-dates'));
const today = NOW.iso.slice(0, 10);

const recValue = (v) => {      // a Recognizers-Text resolution value → "YYYY-MM-DDTHH:MM"
  const s = v.value ?? v.start; if (!s || s.includes('X')) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.slice(0, 16).replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
  if (/^\d{2}:\d{2}/.test(s)) return `${today}T${s.slice(0, 5)}`;
  return null;
};

export const ADAPTERS = [
  { id: 'chrono', name: 'chrono-node', lang: 'JavaScript', pkg: 'chrono-node', call: 'chrono.parseDate(text, now)',
    parse: (t) => iso(chrono.parseDate(t, ref())) },
  { id: 'sugar', name: 'Sugar', lang: 'JavaScript', pkg: 'sugar', call: 'Sugar.Date.create(text)',
    parse: (t) => { const d = Sugar.Date.create(t); return Sugar.Date.isValid(d) ? iso(d) : null; } },
  { id: 'anydate', name: 'any-date-parser', lang: 'JavaScript', pkg: 'any-date-parser', call: 'parser.fromString(text)',
    parse: (t) => { const d = anyDate.fromString(t); return d && d.invalid == null ? iso(d) : null; } },
  { id: 'recognizers', name: 'Recognizers-Text', lang: 'JavaScript', pkg: '@microsoft/recognizers-text-date-time', call: "recognizeDateTime(text, 'en-us', _, now) · nearest reading",
    parse: (t) => {   // it returns every reading (past and future); we keep the one nearest to now
      const r = Rec.recognizeDateTime(t, 'en-us', undefined, ref());
      const vs = (r[0]?.resolution?.values ?? []).map(recValue).filter(Boolean);
      return vs.sort((x, y) => Math.abs(RealDate.parse(x + 'Z') - REF) - Math.abs(RealDate.parse(y + 'Z') - REF))[0] ?? null;
    } },
  { id: 'datejs', name: 'date.js', lang: 'JavaScript', pkg: 'date.js', call: 'date(text, now)',
    parse: (t) => iso(datejs(t, ref())) },
  { id: 'compromise', name: 'compromise-dates', lang: 'JavaScript', pkg: 'compromise-dates', call: "nlp(text).dates({ today }).get() · .times() when no date",
    parse: (t) => {
      const doc = nlp(t), d = doc.dates({ today, timezone: 'UTC' }).get()[0];
      if (d?.start) return d.start.slice(0, 16);
      const tm = doc.times({ today }).get()[0];
      return tm?.['24h'] ? `${today}T${tm['24h'].padStart(5, '0')}` : null;
    } },
];

/* ---------- run: answers once, then timing ---------- */
const out = [];
for (const a of ADAPTERS) {
  const answers = CASES.map((c) => { try { return a.parse(c.text); } catch (e) { return null; } });
  for (let w = 0; w < 2; w++) CASES.forEach((c) => { try { a.parse(c.text); } catch {} });
  const per = CASES.map((c) => {             // median of 7 timed calls per phrase, in microseconds
    const ts = [];
    for (let k = 0; k < 7; k++) { const t0 = process.hrtime.bigint(); try { a.parse(c.text); } catch {} ts.push(Number(process.hrtime.bigint() - t0) / 1000); }
    return ts.sort((x, y) => x - y)[3];
  });
  const sorted = per.slice().sort((x, y) => x - y);
  out.push({ id: a.id, name: a.name, lang: a.lang, pkg: a.pkg, version: pkg(a.pkg), call: a.call, answers, us: per.map((v) => +v.toFixed(1)), medianUs: +sorted[Math.floor(sorted.length / 2)].toFixed(1) });
  console.log(a.name.padEnd(18), 'done', `${sorted[90].toFixed(0)} µs median`);
}
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./out/js.json', import.meta.url), JSON.stringify({ node: process.version, ranAt: new RealDate().toISOString(), parsers: out }, null, 1));
