// Scores out/js.json + out/py.json against the answer key → out/results.json.  node score.mjs [--misses id]
import fs from 'node:fs';
import { CASES, CATS, NOW, judge } from './cases.mjs';
const rd = (f) => JSON.parse(fs.readFileSync(new URL(`./out/${f}`, import.meta.url)));
const js = rd('js.json'), py = rd('py.json');
const parsers = [...js.parsers, ...py.parsers];
const meta = rd('meta.json');

const scored = parsers.map((p) => {
  const verdict = CASES.map((c, i) => {
    const got = p.answers[i], ok = judge(got, c.accept);
    return ok ? 'ok' : got === null ? 'empty' : 'wrong';
  });
  const byCat = Object.fromEntries(CATS.map((k) => {
    const idx = CASES.map((c, i) => c.cat === k.id ? i : -1).filter((i) => i >= 0);
    return [k.id, idx.filter((i) => verdict[i] === 'ok').length];
  }));
  const dated = CASES.map((c, i) => i).filter((i) => !CASES[i].accept.includes(null));
  const nulls = CASES.map((c, i) => i).filter((i) => CASES[i].accept.includes(null));
  return {
    id: p.id, name: p.name, lang: p.lang, pkg: p.pkg, version: p.version, call: p.call,
    right: verdict.filter((v) => v === 'ok').length,
    wrong: verdict.filter((v) => v === 'wrong').length,
    empty: verdict.filter((v) => v === 'empty').length,
    invented: nulls.filter((i) => verdict[i] === 'wrong').length,      // a date for a phrase that has none
    nullsTotal: nulls.length,
    confidentWrong: dated.filter((i) => verdict[i] === 'wrong').length, // a date, but the wrong one
    medianUs: p.medianUs, us: p.us, installKB: meta[p.id].installKB, weekly: meta[p.id].weekly, byCat, verdict, answers: p.answers,
  };
}).sort((a, b) => b.right - a.right || a.invented - b.invented);

const res = { meta: meta.note, measuredAt: meta.measuredAt, now: NOW, n: CASES.length, cats: CATS, cases: CASES, node: js.node, python: py.python, ranAt: py.ranAt, parsers: scored };
fs.writeFileSync(new URL('./out/results.json', import.meta.url), JSON.stringify(res, null, 1));

console.log('parser'.padEnd(18), 'right', 'wrong', 'empty', 'invented', ' µs', '  ', CATS.map((k) => k.id.slice(0, 5).padStart(5)).join(''));
for (const p of scored) console.log(p.name.padEnd(18), String(p.right).padStart(5), String(p.wrong).padStart(5), String(p.empty).padStart(5), `${p.invented}/${p.nullsTotal}`.padStart(8), String(Math.round(p.medianUs)).padStart(5), '  ', CATS.map((k) => String(p.byCat[k.id]).padStart(5)).join(''));

const m = process.argv.indexOf('--misses');
if (m > 0) {
  const p = scored.find((x) => x.id === process.argv[m + 1]);
  CASES.forEach((c, i) => { if (p.verdict[i] !== 'ok') console.log(`${c.cat.padEnd(9)} ${JSON.stringify(c.text).padEnd(48)} got ${String(p.answers[i]).padEnd(17)} want ${c.accept.join(' | ')}`); });
}
