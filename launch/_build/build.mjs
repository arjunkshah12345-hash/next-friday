// node _build/build.mjs → writes index.html (sound: python3 _build/sound.py → assets/audio/score.wav) and compositions/{cal,board,end}.html from the benchmark's results.json
// Every number and answer on screen comes from ../site/public/data/results.json.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url);
const R = JSON.parse(fs.readFileSync(new URL('../site/public/data/results.json', ROOT), 'utf8'));
const P = R.parsers;
const slug = (n) => n.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const ci = (t) => { const i = R.cases.findIndex((c) => c.text === t); if (i < 0) throw new Error('no case ' + t); return i; };

const C = { paper: '#f9f9f7', ink: '#16181d', muted: '#5f636b', cell: '#efefec', blue: '#0b6fd3', red: '#c8262b' };
const FONTS = `
@font-face { font-family: "Instrument Serif"; src: url("assets/fonts/instrument-serif.woff2") format("woff2"); font-weight: 400; }
@font-face { font-family: "Geist"; src: url("assets/fonts/geist.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url("assets/fonts/geist-mono.woff2") format("woff2"); font-weight: 100 900; }`;
const tile = (c, l) => `url(assets/dither/${c}-${l}.svg)`;

/* ---------------------------------------------------------------- calendar scene (0 → 20 s) */
const START = Date.UTC(2026, 9, 19);
const DAYS = Array.from({ length: 35 }, (_, i) => new Date(START + i * 864e5));
const TODAY = 9; // Wed 28 Oct
const dayOf = (iso) => { if (!iso || iso.length < 10) return null; const d = Math.round((Date.parse(iso.slice(0, 10) + 'T00:00Z') - START) / 864e5); return d >= 0 && d < 35 ? d : null; };
const CX = (d) => 830 + (d % 7) * 140, CY = (d) => 230 + Math.floor(d / 7) * 150;
const RX = (i) => 1176 + i * 58, RY = 62;
const AV = 44, AVS = 36 / 44;

// the four phrases the film runs, with their real answers
const PHRASES = ['next Friday', '4 days from tomorrow', 'Sun Microsystems was bought by Oracle', 'Room 1104'].map((t) => {
  const i = ci(t);
  return { text: t, i, accept: R.cases[i].accept, answers: P.map((p) => p.answers[i]), verdict: P.map((p) => p.verdict[i]) };
});
for (const ph of PHRASES) console.log(ph.text, ph.answers.join(' | '));

// real phrases for the fast cycle, spread across the set
const CYCLE = [12, 25, 38, 51, 64, 77, 90, 103, 116, 129, 142, 155, 168, 179].map((k) => R.cases[k].text);
const COUNT = [2, 5, 11, 19, 30, 44, 60, 79, 99, 119, 139, 157, 171, 180];

const cells = DAYS.map((d, i) => {
  const n = d.getUTCDate(), label = n === 1 ? `${n} Nov` : `${n}`;
  return `<div class="cell${i < TODAY ? ' past' : ''}" id="c${i}" style="left:${CX(i)}px;top:${CY(i)}px"><div class="dz" id="dz${i}"></div><span class="dn">${label}</span>${i === TODAY ? '<span class="now" data-layout-ignore>now</span>' : ''}<div class="okl" id="ok${i}"></div></div>`;
}).join('\n      ');
const slots = P.map((_, i) => `<div class="slot" style="left:${RX(i) - 3}px;top:${RY - 3}px"></div>`).join('');
const avatars = P.map((p, i) => `<img class="av" id="av${i}" src="assets/avatars/${slug(p.name)}.png" alt="${p.name}" />`).join('\n      ');
const line = (id, start, dur, text, cls = '') => `<div id="${id}" class="clip ln ${cls}" data-start="${start}" data-duration="${dur}" data-track-index="2"><span class="in">${text}</span></div>`;

// title lines: [id, in, out, text]
const TITLES = [
  ['t0', 0, 2.7, 'Which Friday is next&nbsp;Friday?'],
  ['t1', 2.7, 4.5, 'We asked 11 date&nbsp;parsers'],
  ['t2', 4.5, 6.1, 'Six said 6&nbsp;November'],
  ['t3', 6.1, 7.7, 'Three said 30&nbsp;October'],
  ['t4', 7.7, 9.1, 'Two said nothing'],
  ['t5', 9.1, 10.95, 'Then 179 more&nbsp;phrases'],
  ['t6', 11.3, 13.9, 'Four of 11 found&nbsp;Monday'],
  ['t7', 14.3, 16.9, 'Five found a date in&nbsp;it'],
  ['t8', 17.3, 19.6, 'Three moved it to&nbsp;1104'],
];
// phrase under test: [id, in, out, text]
const PH_LINES = [['p0', 0, 9.1, PHRASES[0].text], ['p2', 10.9, 13.9, PHRASES[1].text], ['p3', 13.9, 16.9, PHRASES[2].text], ['p4', 16.9, 19.6, PHRASES[3].text]];

const calHtml = `<template>
  <style>${FONTS}
    #root { position: absolute; inset: 0; background: ${C.paper}; color: ${C.ink}; font-family: "Geist", sans-serif; overflow: hidden; }
    #cal-stage { position: absolute; inset: 0; }
    .cell { position: absolute; width: 130px; height: 140px; border-radius: 8px; background: ${C.cell}; overflow: hidden; }
    .dz { position: absolute; inset: 0; background-size: 12px 12px; image-rendering: pixelated; }
    .dn { position: absolute; left: 10px; top: 8px; padding: 0 5px; border-radius: 4px; background: ${C.cell}; font: 40px/1.1 "Instrument Serif", serif; }
    .past .dn { color: ${C.muted}; }
    .now { position: absolute; right: 9px; top: 11px; padding: 3px 8px; border-radius: 5px; background: ${C.ink}; color: ${C.paper}; font: 500 22px/1 "Geist", sans-serif; }
    .okl { position: absolute; inset: 0; border: 4px solid ${C.blue}; border-radius: 8px; opacity: 0; }
    .slot { position: absolute; width: 50px; height: 50px; border-radius: 7px; border: 2px dashed #d6d6d1; }
    .av { position: absolute; left: 0; top: 0; width: ${AV}px; height: ${AV}px; border-radius: 6px; transform-origin: 0 0; image-rendering: pixelated; z-index: 5; }
    #cal-head { position: absolute; left: 830px; top: 140px; font: 500 28px/1.2 "Geist", sans-serif; }
    #cal-yr { display: inline-block; position: relative; height: 1.2em; overflow: hidden; vertical-align: bottom; }
    #cal-yr span { display: block; }
    #yr-b { position: absolute; left: 0; top: 0; color: ${C.red}; }
    .wk { position: absolute; top: 194px; font: 28px/1 "Geist", sans-serif; color: ${C.muted}; }
    #cal-asked { position: absolute; left: 120px; top: 146px; font: 28px/1.3 "Geist", sans-serif; color: ${C.muted}; }
    .ph { position: absolute; left: 120px; top: 196px; width: 640px; font: 500 40px/1.25 "Geist Mono", monospace; }
    .ph .in { display: block; }
    #cal-count { position: absolute; left: 120px; top: 290px; font: 28px/1 "Geist", sans-serif; color: ${C.muted}; }
    .ln { position: absolute; left: 120px; top: 360px; width: 640px; overflow: hidden; font: 112px/1 "Instrument Serif", serif; letter-spacing: -0.015em; padding-bottom: 0.12em; }
    .ln .in { display: block; }
  </style>
  <div id="root" data-composition-id="cal" data-width="1920" data-height="1080">
    <div id="cal-stage" class="clip" data-start="0" data-duration="20" data-track-index="1">
      <div id="cal-asked">Asked at 14:30 on Wednesday 28 October 2026</div>
      <div id="cal-head">October – November <span id="cal-yr"><span id="yr-a">2026</span><span id="yr-b">1104</span></span></div>
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, k) => `<div class="wk" style="left:${CX(k) + 12}px">${d}</div>`).join('')}
      ${slots}
      ${cells}
      ${avatars}
      <div id="cal-count"></div>
    </div>
    ${PH_LINES.map(([id, a, b, t]) => `<div id="${id}" class="clip ph" data-start="${a}" data-duration="${(b - a).toFixed(2)}" data-track-index="3"><span class="in">“${t}”</span></div>`).join('\n    ')}
    <div id="p1" class="clip ph" data-start="9.1" data-duration="1.8" data-track-index="3"><span class="in" id="p1-text">“${CYCLE[0]}”</span></div>
    ${TITLES.map(([id, a, b, t]) => line(id, a, (b - a).toFixed(2), t)).join('\n    ')}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    const E = "expo.out", M = "power3.inOut";
    const P = ${JSON.stringify(P.map((p) => p.name))};
    const PH = ${JSON.stringify(PHRASES.map((p) => ({ answers: p.answers, verdict: p.verdict, accept: p.accept })))};
    const START = ${START}, TODAY = ${TODAY};
    const dayOf = ${dayOf.toString()};
    const CX = ${CX.toString()}, CY = ${CY.toString()};
    const RX = ${RX.toString()}, RY = ${RY}, AVS = ${AVS};
    const BLUE = "${C.blue}", RED = "${C.red}";
    const tile = (l) => l > 0 ? "url(assets/dither/ink-" + l + ".svg)" : "none";

    // where every avatar is, so each move is a fromTo (seek-safe)
    const pos = P.map((_, i) => ({ x: RX(i), y: RY, s: 1 }));
    P.forEach((_, i) => tl.set("#av" + i, { x: pos[i].x, y: pos[i].y, scale: 1, boxShadow: "0 0 0 0px transparent" }, 0));
    const move = (i, to, t, dur, ease) => { const f = pos[i]; tl.fromTo("#av" + i, { x: f.x, y: f.y, scale: f.s }, { x: to.x, y: to.y, scale: to.s, duration: dur, ease, immediateRender: false }, t); pos[i] = to; };
    const ring = (i, c, t) => tl.set("#av" + i, { boxShadow: c ? "0 0 0 4px " + c : "0 0 0 0px transparent" }, t);

    // drop one phrase's answers onto the calendar; returns the days touched
    function drop(k, t0, onlyDated, okAt) {
      const ph = PH[k], count = {}, touched = new Set();
      const okDays = ph.accept.filter((a) => a && a.length >= 10).map(dayOf).filter((d) => d !== null);
      okDays.forEach((d) => tl.fromTo("#ok" + d, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.4, ease: E, immediateRender: false }, okAt ?? t0 - 0.5));
      let n = 0;
      ph.answers.forEach((a, i) => {
        const d = dayOf(a), right = ph.verdict[i] === "ok";
        if (a === null && onlyDated) return;            // stays home
        const t = t0 + n++ * 0.085;
        if (d === null) { move(i, { x: pos[i].x, y: 1180, s: AVS }, t, 0.6, "power2.in"); if (a !== null) ring(i, RED, t); return; }
        const kk = (count[d] = (count[d] || 0) + 1) - 1;
        move(i, { x: CX(d) + 10 + (kk % 3) * 40, y: CY(d) + 140 - 46 - Math.floor(kk / 3) * 40, s: AVS }, t, 0.55, M);
        tl.set("#dz" + d, { backgroundImage: tile(Math.min(13, 2 + kk * 2)) }, t + 0.5);
        ring(i, right ? BLUE : RED, t + 0.5);
        touched.add(d);
      });
      return { touched, okDays };
    }
    // everyone home, the calendar clean
    function home(t0, state) {
      P.forEach((_, i) => { move(i, { x: RX(i), y: RY, s: 1 }, t0 + i * 0.03, 0.5, M); ring(i, null, t0); });
      state.touched.forEach((d) => tl.set("#dz" + d, { backgroundImage: "none" }, t0 + 0.15));
      state.okDays.forEach((d) => tl.to("#ok" + d, { opacity: 0, duration: 0.25, ease: "power2.in" }, t0));
    }

    // title lines rise inside their mask and leave upward
    const TT = ${JSON.stringify(TITLES)};
    TT.forEach(([id, a, b]) => {
      if (a > 0) tl.fromTo("#" + id + " .in", { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: E, immediateRender: false }, a);
      tl.fromTo("#" + id + " .in", { yPercent: 0 }, { yPercent: -110, duration: 0.33, ease: "power2.in", immediateRender: false }, b - 0.36);
    });
    // the phrase under test types in
    ${JSON.stringify(PH_LINES)}.forEach(([id, a, b, t]) => {
      if (a > 0) tl.fromTo("#" + id + " .in", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: Math.min(0.9, 0.035 * t.length), ease: "steps(" + (t.length + 2) + ")", immediateRender: false }, a);
    });

    // 0.8 s: the question becomes the Friday column; 1.6 s: the two Fridays it could mean
    [4, 11, 18, 25, 32].forEach((d, k) => tl.set("#dz" + d, { backgroundImage: tile(2) }, 0.8 + k * 0.07));
    [4, 11, 18, 25, 32].forEach((d) => tl.set("#dz" + d, { backgroundImage: "none" }, 2.9));

    // "next Friday"
    const s1 = drop(0, 3.0, false, 1.6);
    home(9.1, s1);

    // 179 more: the phrase cycles, the counter climbs, the grid works
    const CYC = ${JSON.stringify(CYCLE)}, CNT = ${JSON.stringify(COUNT)};
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    CYC.forEach((t, k) => {
      const at = 9.2 + k * 0.12;
      tl.set("#p1-text", { textContent: "“" + t + "”" }, at);
      tl.set("#cal-count", { textContent: CNT[k] + " of 180" }, at);
      for (let j = 0; j < 6; j++) { const d = Math.floor(rnd() * 35); tl.set("#dz" + d, { backgroundImage: tile(2 + Math.floor(rnd() * 9)) }, at); tl.set("#dz" + d, { backgroundImage: "none" }, at + 0.32); }
    });
    tl.set("#cal-count", { textContent: "" }, 0);
    tl.set("#cal-count", { textContent: "" }, 10.9);

    // "4 days from tomorrow"
    const s2 = drop(1, 11.0, false);
    home(13.9, s2);
    // "Sun Microsystems was bought by Oracle": staying home is right
    const s3 = drop(2, 14.4, true);
    PH[2].answers.forEach((a, i) => { if (a === null) ring(i, BLUE, 15.4); });
    home(16.9, s3);
    // "Room 1104": the year moves
    const ph4 = PH[3]; let hx = 0, yx = 0;
    const s4 = { touched: new Set(), okDays: [] };
    ph4.answers.forEach((a, i) => {
      if (a === null) return;
      const t = 17.4 + hx * 0.09;
      if (a.startsWith("1104")) { move(i, { x: 1200 + yx++ * 42, y: 136, s: AVS }, t, 0.55, M); ring(i, RED, t + 0.5); hx++; return; }
      const d = dayOf(a); move(i, { x: CX(d) + 10, y: CY(d) + 94, s: AVS }, t, 0.55, M); ring(i, RED, t + 0.5); s4.touched.add(d); tl.set("#dz" + d, { backgroundImage: tile(4) }, t + 0.5); hx++;
    });
    ph4.answers.forEach((a, i) => { if (a === null) ring(i, BLUE, 18.2); });
    tl.fromTo("#yr-a", { yPercent: 0 }, { yPercent: -110, duration: 0.45, ease: M, immediateRender: false }, 17.9);
    tl.fromTo("#yr-b", { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: M, immediateRender: false }, 17.9);
    tl.set("#yr-b", { yPercent: 110 }, 0);

    // 19.4 s: every avatar flies to its leaderboard row; the calendar dissolves
    P.forEach((_, i) => { ring(i, null, 19.35); move(i, { x: 820, y: 140 + i * 76, s: 1 }, 19.35 + i * 0.02, 0.5, M); });
    tl.to("#cal-stage .cell, #cal-stage .slot, #cal-stage .wk, #cal-head, #cal-asked", { opacity: 0, duration: 0.3, ease: "power2.in", stagger: 0.004 }, 19.35);

    window.__timelines["cal"] = tl;
  </script>
</template>
`;

/* ---------------------------------------------------------------- leaderboard scene (20 → 27.5 s) */
const BX = 1240, BW = 560;
const rows = P.map((p, i) => `<div class="row" style="top:${140 + i * 76}px">
        <img class="bav" src="assets/avatars/${slug(p.name)}.png" alt="${p.name}" />
        <span class="nm" id="nm${i}">${p.name}</span>
        <span class="num" id="num${i}">${p.right}</span>
        <span class="track"></span>
        <span class="bar" id="bar${i}" style="width:${(p.right / 180) * BW}px;background-image:${tile(i === 0 ? 'blue' : 'ink', 12)}"></span>
        <span class="wr" id="wr${i}" style="left:${BX - 820 + (p.right / 180) * BW}px;width:${(p.wrong / 180) * BW}px"></span>
      </div>`).join('\n      ');
const digits = String(P[0].right).split('').map((d, k) => `<span class="dg"><span class="strip" id="dg${k}" data-layout-ignore>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${n}</span>`).join('')}</span></span>`).join('');
const boardHtml = `<template>
  <style>${FONTS}
    #root { position: absolute; inset: 0; background: ${C.paper}; color: ${C.ink}; font-family: "Geist", sans-serif; overflow: hidden; }
    .row { position: absolute; left: 820px; width: 980px; height: 60px; }
    .bav { position: absolute; left: 0; top: 0; width: 44px; height: 44px; border-radius: 6px; image-rendering: pixelated; }
    .nm { position: absolute; left: 62px; top: 6px; font: 500 28px/1.2 "Geist", sans-serif; }
    .num { position: absolute; left: ${BX - 820 - 96}px; width: 76px; top: 6px; text-align: right; font: 500 28px/1.2 "Geist", sans-serif; font-variant-numeric: tabular-nums; }
    .track { position: absolute; left: ${BX - 820}px; top: 12px; width: ${BW}px; height: 20px; background: ${C.cell}; }
    .bar { position: absolute; left: ${BX - 820}px; top: 12px; height: 20px; background-size: 6px 6px; image-rendering: pixelated; transform-origin: 0 50%; }
    .wr { position: absolute; top: 12px; height: 20px; transform-origin: 0 50%; background: repeating-linear-gradient(45deg, ${C.red} 0 3px, transparent 3px 7px); }
    #b-big { position: absolute; left: 112px; top: 150px; display: flex; font: 330px/1 "Instrument Serif", serif; letter-spacing: -0.04em; }
    .dg { display: block; height: 1em; overflow: hidden; }
    .strip { display: flex; flex-direction: column; }
    .strip span { height: 1em; display: block; text-align: right; }
    .bl { position: absolute; left: 120px; top: 520px; width: 620px; overflow: hidden; font: 72px/1.02 "Instrument Serif", serif; letter-spacing: -0.01em; padding-bottom: 0.1em; }
    .bl .in { display: block; }
    #b-claim { top: 380px; font-size: 112px; }
    #b-80 { position: absolute; left: ${BX + BW * 0.8}px; top: 104px; width: 0; height: 880px; border-left: 3px dashed ${C.ink}; transform-origin: 50% 0; }
    #b-80l { position: absolute; left: ${BX + BW * 0.8 - 34}px; top: 66px; font: 500 28px/1 "Geist", sans-serif; }
  </style>
  <div id="root" data-composition-id="board" data-width="1920" data-height="1080">
    <div id="b-stage" class="clip" data-start="0" data-duration="7.5" data-track-index="1">
      ${rows}
      <div id="b-80"></div><div id="b-80l">80%</div>
      <div id="b-big">${digits}</div>
    </div>
    <div id="b-of" class="clip bl" data-start="1.6" data-duration="1.8" data-track-index="2"><span class="in">of 180, the best&nbsp;score</span></div>
    <div id="b-no" class="clip bl" data-start="3.4" data-duration="1.6" data-track-index="2"><span class="in">No library cleared&nbsp;80%</span></div>
    <div id="b-claim" class="clip bl" data-start="5.0" data-duration="2.5" data-track-index="2"><span class="in">Saying nothing beats&nbsp;guessing</span></div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    const E = "expo.out";
    const N = ${P.length}, TOP = "${P[0].right}";
    for (let i = 0; i < N; i++) {
      tl.fromTo("#nm" + i + ", #num" + i, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, ease: E, immediateRender: false }, 0.1 + i * 0.03);
      tl.fromTo("#bar" + i, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: E, immediateRender: false }, 0.25 + i * 0.05);
      tl.set("#wr" + i, { scaleX: 0 }, 0);
      tl.fromTo("#wr" + i, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: E, immediateRender: false }, 4.9 + i * 0.04);
    }
    // 137 rolls in, digit by digit
    TOP.split("").forEach((d, k) => tl.fromTo("#dg" + k, { yPercent: 0 }, { yPercent: -10 * Number(d), duration: 1.3, ease: E, immediateRender: false }, 0.35 + k * 0.12));
    // the 80% line drops through every bar
    tl.set("#b-80, #b-80l", { opacity: 0 }, 0);
    tl.fromTo("#b-80", { opacity: 1, scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: E, immediateRender: false }, 3.1);
    tl.fromTo("#b-80l", { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 3.2);
    tl.to("#b-80, #b-80l", { opacity: 0, duration: 0.25 }, 4.75);
    // the number leaves for the claim
    tl.to("#b-big", { yPercent: -8, opacity: 0, duration: 0.35, ease: "power2.in" }, 4.75);
    [["b-of", 1.6, 3.4], ["b-no", 3.4, 5.0], ["b-claim", 5.0, 7.5]].forEach(([id, a, b]) => {
      tl.fromTo("#" + id + " .in", { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: E, immediateRender: false }, a);
      if (id !== "b-claim") tl.fromTo("#" + id + " .in", { yPercent: 0 }, { yPercent: -110, duration: 0.33, ease: "power2.in", immediateRender: false }, b - 0.36);
    });
    window.__timelines["board"] = tl;
  </script>
</template>
`;

/* ---------------------------------------------------------------- end card (27 → 31.5 s, over the board's last half second) */
const bands = [16, 14, 12, 10, 8, 6, 4, 2].map((l, k) => `<div class="band" style="bottom:${k * 56}px;background-image:${tile('blue', l)}"></div>`).join('');
const endHtml = `<template>
  <style>${FONTS}
    #root { position: absolute; inset: 0; color: ${C.ink}; font-family: "Geist", sans-serif; overflow: hidden; }
    #e-paper { position: absolute; inset: 0; background: ${C.paper}; }
    #e-floor { position: absolute; left: 0; right: 0; bottom: 0; height: 448px; }
    .band { position: absolute; left: 0; right: 0; height: 56px; background-size: 12px 12px; image-rendering: pixelated; }
    #e-mark { position: absolute; left: 0; right: 0; top: 250px; text-align: center; font: 220px/1 "Instrument Serif", serif; letter-spacing: -0.02em; -webkit-mask-size: 10px 10px; mask-size: 10px 10px; }
    #e-sub { position: absolute; left: 0; right: 0; top: 500px; text-align: center; font: 38px/1.3 "Geist", sans-serif; color: ${C.muted}; }
    #e-btn { position: absolute; left: 50%; top: 600px; transform: translateX(-50%); }
    #e-btn span { display: inline-block; padding: 22px 40px; border-radius: 8px; background: ${C.ink}; color: ${C.paper}; font: 500 32px/1 "Geist", sans-serif; white-space: nowrap; }
  </style>
  <div id="root" data-composition-id="end" data-width="1920" data-height="1080">
    <div id="e-stage" class="clip" data-start="0" data-duration="4.5" data-track-index="1">
      <div id="e-paper"></div>
      <div id="e-floor">${bands}</div>
      <div id="e-mark" data-var-text="name">Next Friday</div>
      <div id="e-sub" data-var-text="line">11 date parsers. 180 phrases. Every answer.</div>
      <div id="e-btn"><span data-var-text="cta">Read the results</span></div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#e-paper", { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.inOut", immediateRender: false }, 0.05);
    tl.set("#e-paper", { opacity: 0 }, 0);
    tl.fromTo("#e-floor", { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: "expo.out", immediateRender: false }, 0);
    tl.set("#e-floor", { yPercent: 100 }, 0);
    // the name resolves through the dither, level by level
    tl.set("#e-mark", { opacity: 0 }, 0);
    [2, 4, 6, 8, 10, 12, 14, 16].forEach((l, k) => tl.set("#e-mark", { opacity: 1, webkitMaskImage: "url(assets/dither/ink-" + l + ".svg)", maskImage: "url(assets/dither/ink-" + l + ".svg)" }, 0.75 + k * 0.06));
    tl.set("#e-mark", { webkitMaskImage: "none", maskImage: "none" }, 0.75 + 8 * 0.06);
    tl.fromTo("#e-sub", { clipPath: "inset(0 50% 0 50%)" }, { clipPath: "inset(0 0% 0 0%)", duration: 0.6, ease: "expo.out", immediateRender: false }, 1.4);
    tl.set("#e-sub", { clipPath: "inset(0 50% 0 50%)" }, 0);
    tl.fromTo("#e-btn span", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.6)", immediateRender: false }, 1.9);
    tl.set("#e-btn span", { opacity: 0 }, 0);
    window.__timelines["end"] = tl;
  </script>
</template>
`;

/* ---------------------------------------------------------------- root */
const host = (id, start, dur, z) => `<div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${start}" data-duration="${dur}" data-track-index="${z}" data-track-kind="graphics" data-width="1920" data-height="1080" style="position:absolute;inset:0;z-index:${z}"></div>`;
const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${C.paper}; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="31.5" data-width="1920" data-height="1080">
      ${host('cal', 0, 20, 1)}
      ${host('board', 20, 7.5, 2)}
      ${host('end', 27, 4.5, 3)}
      <audio id="score" class="clip" src="assets/audio/score.wav" data-start="0" data-duration="31.5" data-track-index="4" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(new URL('index.html', ROOT), indexHtml);
fs.writeFileSync(new URL('compositions/cal.html', ROOT), calHtml);
fs.writeFileSync(new URL('compositions/board.html', ROOT), boardHtml);
fs.writeFileSync(new URL('compositions/end.html', ROOT), endHtml);
console.log('wrote index.html + 3 scenes');
