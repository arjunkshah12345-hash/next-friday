import { useMemo, useState } from "react"
import { DitherGradient } from "@/components/dither-kit/gradient"
import { DitherShader } from "@/lib/dither"
import { P, R, accepts, fmtAnswer } from "@/lib/bench"
import { delay } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { LibAvatar } from "./lib-badge"

export function Method() {
  return (
    <section id="method" className="mx-auto max-w-[1280px] scroll-mt-8 px-5 pt-32 md:px-16">
      <h2 className="font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">How we scored it</h2>
      <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <ol className="space-y-5 text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
          <li><b>One clock.</b> Every library ran with “now” set to {R.now.label}, and every process ran with <code className="font-mono text-[13px] text-foreground">TZ=UTC</code>. Where an API takes a reference time we passed it; where a library reads the system clock, the clock was frozen.</li>
          <li><b>Defaults.</b> Each library’s main entry point with its default settings, exactly as listed on the right. No locale switches, no “prefer future dates” flags.</li>
          <li><b>Every fair reading counts.</b> “next Friday” on a Wednesday is the 30th or the 6th, and both score. A phrase without a time accepts any time; “next month” accepts any day in November.</li>
          <li><b>One answer per phrase.</b> Ranges are scored on their start. Recognizers-Text returns every reading it finds; we keep the one nearest to now.</li>
          <li><b>No date is an answer.</b> Nineteen phrases have none. Returning a date for one is a miss.</li>
        </ol>
        <div className="relative overflow-x-auto border-y border-foreground/15">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">The exact call used for each library</caption>
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="px-4 py-2 font-normal">Library</th><th scope="col" className="px-4 py-2 font-normal">Call</th></tr></thead>
            <tbody className="divide-y">
              {P.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-normal"><span className="flex items-center gap-2"><LibAvatar p={p} size={18} />{p.pkg} <span className="text-muted-foreground">{p.version}</span></span></th>
                  <td className="px-4 py-2 font-mono text-[12px]">{p.call}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-8 max-w-[68ch] text-sm text-muted-foreground">
        Run on {new Date(R.ranAt).toUTCString().slice(5, 16)} with Node {R.node.replace("v", "")} and Python {R.python}. We wrote the answer key ourselves; if you’d read a phrase differently,
        it’s in <a className="text-foreground underline decoration-foreground/30 underline-offset-4" href="data/cases.mjs">cases.mjs</a> with every accepted reading.
        Rerun it with <a className="text-foreground underline decoration-foreground/30 underline-offset-4" href="data/run-js.mjs">run-js.mjs</a>, <a className="text-foreground underline decoration-foreground/30 underline-offset-4" href="data/run_py.py">run_py.py</a> and <a className="text-foreground underline decoration-foreground/30 underline-offset-4" href="data/score.mjs">score.mjs</a>.
      </p>
    </section>
  )
}

// A clock's sweep hand trailing ink: the subject is time
const SWEEP = `
float field(vec2 uv, vec2 res, float t) {
  vec2 p = uv - vec2(0.5);
  p.x *= res.x / res.y;
  float r = length(p);
  float a = atan(p.y, p.x) / 6.28318 + 0.5;
  float trail = pow(fract(a + t * 0.015), 4.0);
  float face = smoothstep(0.47, 0.44, r) * smoothstep(0.05, 0.12, r);
  float rim = smoothstep(0.012, 0.0, abs(r - 0.465));
  return clamp(trail * face * 0.9 + rim * 0.7, 0.0, 1.0);
}
`

export function Lookup() {
  const [q, setQ] = useState("next Friday at 9:30")
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? R.cases.map((c, i) => ({ c, i })).filter(({ c }) => c.text.toLowerCase().includes(s)) : []
  }, [q])
  const hit = matches[0]

  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-32 pb-32 md:px-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div>
          <h2 className="font-serif text-[clamp(2.5rem,1.4rem+3.4vw,4.75rem)] leading-[0.95] tracking-[-0.02em]">Look up any of the 180</h2>
          <label htmlFor="q" className="mt-8 block text-sm text-muted-foreground">Type part of a phrase</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false}
            className="mt-2 h-14 w-full rounded-xl border bg-card px-4 font-mono text-lg outline-none focus-visible:ring-2 focus-visible:ring-foreground" />
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {q.trim() ? `${matches.length} ${matches.length === 1 ? "phrase matches" : "phrases match"}` : "Try “tmrw”, “Christmas” or “cats”."}
            {matches.length > 1 && ` · showing “${hit.c.text}”`}
          </p>
          {matches.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {matches.slice(1, 9).map(({ c }) => (
                <button key={c.id} type="button" onClick={() => setQ(c.text)} className="rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground">{c.text}</button>
              ))}
            </div>
          )}
          <div className="relative mt-10 hidden aspect-square w-[min(100%,360px)] md:block">
            <DitherShader className="absolute inset-0" field={SWEEP} stillTime={20} cell={4} palette={["--dither-paper", "blue"]} />
          </div>
        </div>

        <div className="border-y border-foreground/15">
          {hit ? (
            <>
              <p className="border-b py-3">
                <span className="font-mono">“{hit.c.text}”</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {R.cats.find((k) => k.id === hit.c.cat)!.name} · the key accepts {hit.c.accept.map((a) => fmtAnswer(a, a !== null && a.length > 10)).join(" or ")}
                </span>
              </p>
              <ul className="divide-y text-sm">
                {P.map((p, n) => {
                  const a = p.answers[hit.i], ok = accepts(hit.c.accept, a)
                  return (
                    <li key={`${hit.c.id}-${p.id}`} className="nf-rise flex items-center gap-3 py-2.5" style={delay(n * 24)}>
                      <LibAvatar p={p} size={22} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className={cn("tnum whitespace-nowrap", !a && "text-muted-foreground", !ok && a && "text-dither-red")}>{fmtAnswer(a)}</span>
                      <span className={cn("w-4 text-center", ok ? "text-key" : "text-dither-red")} aria-label={ok ? "right" : "wrong"}>{ok ? "✓" : "✗"}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="px-4 py-10 text-center text-muted-foreground">No phrase in the set contains “{q}”.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t">
      <DitherGradient from="blue" direction="up" opacity={0.18} />
      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-12 text-sm md:flex-row md:justify-between md:px-16">
        <p className="tnum font-mono text-xs">next friday · 11 parsers · 180 phrases · run {R.ranAt.slice(0, 10)} · now = {R.now.iso.replace(":00Z", " UTC").replace("T", " ")}</p>
        <p className="max-w-[60ch] text-[13px] text-foreground/80">Library names belong to their authors. Numbers are from one run on one machine; the harness is linked above so you can check them.</p>
      </div>
    </footer>
  )
}
