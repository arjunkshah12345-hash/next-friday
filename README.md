# Next Friday

A real benchmark of 11 natural-language date parsers on 180 hand-keyed phrases, and the site that shows it.

**Site:** https://arjunkshah12345-hash.github.io/next-friday/

## Rerun the benchmark

```bash
cd bench
npm i                                    # chrono-node, sugar, any-date-parser, recognizers-text, date.js, compromise(-dates)
uv venv .venv && uv pip install --python .venv/bin/python dateparser parsedatetime python-dateutil ctparse timefhuman
node -e "import('./cases.mjs').then(m=>require('fs').writeFileSync('out/cases.json', JSON.stringify(m.CASES)))"
TZ=UTC node run-js.mjs && TZ=UTC .venv/bin/python run_py.py && node score.mjs
node score.mjs --misses chrono           # every miss for one library
```

`cases.mjs` is the answer key (clock frozen at Wed 28 Oct 2026 14:30 UTC). `out/meta.json` holds install sizes and weekly downloads, measured by hand on 2026-10-28.

## Build the site

```bash
cp bench/out/results.json site/src/data/ && cp bench/out/{results,cases}.json bench/{cases.mjs,run-js.mjs,run_py.py,score.mjs} site/public/data/
cd site && npm i && npm run build        # → site/dist (relative paths; serve anywhere)
```

Vite + React 19 + Tailwind v4 + shadcn. Dithers: dithercn engine in `src/lib/dither` (calendar heat, leaderboard bars, category grid, the sweep shader) and dither-kit in `src/components/dither-kit` (avatars, stacked bar chart, button, footer gradient). dither-kit was installed from its GitHub registry because tripwire.sh refused TLS from this machine.

## Launch film

`launch/` is a 31.5 s HyperFrames film (1920×1080, 30 fps, stereo sound). Every answer and number in it is read from `site/public/data/results.json` by `launch/_build/build.mjs`, which writes `index.html` and the three scenes. The sound is written in code by `launch/_build/sound.py` (numpy + scipy + ffmpeg, no samples): a 120 bpm score in D, and an effect for each avatar landing. Blue answers ring in key and red ones knock. The cue times follow the same answers, and the track is mastered to -15 LUFS.

```bash
cd launch
node _build/build.mjs          # regenerate scenes after a rerun of the bench
python3 _build/sound.py        # regenerate the score (assets/audio/score.wav)
npx hyperframes preview        # edit in the Studio
npx hyperframes render -o renders/next-friday-launch.mp4
```
