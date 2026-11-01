import { useState } from "react"
import { DitherFade } from "@/components/dithercn/dither-fade"
import { ditherMaskStyle } from "@/lib/dither"
import { P, R, fmtAnswer, fmtUs } from "@/lib/bench"
import { delay, useScrollProgress, useSeen } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { LibAvatar } from "./lib-badge"

export function Categories() {
  const [cat, setCat] = useState("weekday")
  const idx = R.cases.map((c, i) => (c.cat === cat ? i : -1)).filter((i) => i >= 0)
  const C = R.cats.find((c) => c.id === cat)!
  const [grid, seen] = useSeen<HTMLDivElement>(0.3)

  return (
    <section className="dark relative mt-32 bg-background py-40 text-foreground">
      {/* the paper dissolves into the dark band and back, cell by cell */}
      <DitherFade side="top" size={110} color="oklch(0.984 0.003 95)" cell={4} />
      <DitherFade side="bottom" size={110} color="oklch(0.984 0.003 95)" cell={4} />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
      <h2 className="font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">Where each library breaks</h2>
      <p className="mt-5 max-w-[60ch] text-muted-foreground">
        Fifteen phrases in each of twelve kinds. Pick a column to read every phrase and every answer.
      </p>

      <div ref={grid} className="mt-12 relative overflow-x-auto">
        <table className="w-full min-w-[1040px] border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Phrases read right, out of 15, by library and kind of phrase</caption>
          <thead>
            <tr>
              <td />
              {R.cats.map((k) => (
                <th key={k.id} scope="col" className="p-0 align-bottom font-normal">
                  <button type="button" onClick={() => setCat(k.id)} aria-pressed={k.id === cat}
                    className={cn("flex min-h-[64px] w-full items-end rounded-md px-2 pb-2 text-left text-xs leading-tight transition-colors", k.id === cat ? "bg-key text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    {k.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {P.map((p, row) => (
              <tr key={p.id}>
                <th scope="row" className="whitespace-nowrap pr-3 text-left font-normal">
                  <span className="flex items-center gap-2"><LibAvatar p={p} size={18} />{p.name}</span>
                </th>
                {R.cats.map((k, col) => {
                  const v = p.byCat[k.id]
                  return (
                    <td key={k.id} className={cn("relative h-10 overflow-hidden rounded-md bg-muted/60 p-0", k.id === cat && "ring-2 ring-key ring-inset")}>
                      {/* the grid fills one kind of phrase at a time, left to right */}
                      <span className={cn("absolute inset-0 bg-dither-ink transition-opacity duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none", !seen && "opacity-0")}
                        style={{ ...ditherMaskStyle(v / 15), transitionDelay: `${col * 70 + row * 18}ms` }} aria-hidden />
                      <span className="tnum relative ml-1.5 rounded bg-card px-1 text-xs">{v}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 relative overflow-x-auto border-y border-foreground/15">
        <p className="border-b px-4 py-3 text-sm"><span className="font-medium">{C.name}</span> <span className="text-muted-foreground">· {C.blurb}</span></p>
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <caption className="sr-only">Every answer for the {C.name.toLowerCase()} phrases. A blue square is right, a red hatched one wrong, an empty one no answer.</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-normal">Phrase</th>
              {P.map((p) => <th key={p.id} scope="col" className="px-1 py-2 text-center font-normal"><LibAvatar p={p} size={18} className="mx-auto" /><span className="sr-only">{p.name}</span></th>)}
              <th scope="col" className="px-4 py-2 text-right font-normal">Right</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {idx.map((i, n) => {
              const c = R.cases[i]
              return (
                <tr key={c.id} className="nf-rise" style={delay(n * 22)}>
                  <td className="px-4 py-2 font-mono text-[13px]">{c.text}</td>
                  {P.map((p) => {
                    const v = p.verdict[i]
                    return (
                      <td key={p.id} className="px-1 py-2 text-center" title={`${p.name}: ${fmtAnswer(p.answers[i])}`}>
                        <span className={cn("mx-auto block size-3.5 rounded-[3px]", v === "ok" ? "bg-key" : v === "wrong" ? "bg-[repeating-linear-gradient(45deg,var(--dither-color-red)_0_2px,transparent_2px_4px)] ring-1 ring-dither-red" : "ring-1 ring-foreground/25")} />
                        <span className="sr-only">{v === "ok" ? "right" : v === "wrong" ? `wrong: ${fmtAnswer(p.answers[i])}` : "nothing"}</span>
                      </td>
                    )
                  })}
                  <td className="tnum px-4 py-2 text-right">{P.filter((p) => p.verdict[i] === "ok").length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  )
}

/* ---------- speed against accuracy: each library's avatar is its point ---------- */
export function Speed() {
  const lx = (us: number) => (Math.log10(us) - Math.log10(1)) / (Math.log10(3000) - Math.log10(1))
  const ly = (r: number) => 1 - (r - 60) / (145 - 60)
  const chrono = P.find((p) => p.id === "chrono")!, rec = P[0]
  const plot = useScrollProgress<HTMLDivElement>(0.9, 0.3)
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-32 md:px-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)] md:items-center">
        <div className="md:order-1" role="img" aria-label={`Median time per phrase against phrases read right. ${P.map((p) => `${p.name}: ${fmtUs(p.medianUs)}, ${p.right} right`).join("; ")}.`}>
          <div ref={plot} data-scrub className="relative ml-10 mr-4 mt-4 mb-10 h-[380px] [--p:1]">
            {[60, 80, 100, 120, 140].map((r) => (
              <div key={r} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${ly(r) * 100}%` }}>
                <span className="tnum absolute -left-10 -top-2 text-xs text-muted-foreground">{r}</span>
              </div>
            ))}
            {[1, 10, 100, 1000].map((u) => (
              <div key={u} className="absolute inset-y-0 border-l border-border" style={{ left: `${lx(u) * 100}%` }}>
                <span className="tnum absolute -bottom-7 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">{fmtUs(u)}</span>
              </div>
            ))}
            {/* the clock: a hand sweeps the time axis as you scroll and carries each library until its median time */}
            <div aria-hidden className="absolute inset-y-0 w-px bg-key" style={{ left: "calc(var(--p) * 100%)", opacity: "calc((1 - var(--p)) * 4)" }} />
            {P.map((p) => (
              <div key={p.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `calc(min(var(--p), ${lx(p.medianUs).toFixed(4)}) * 100%)`, top: `${ly(p.right) * 100}%` }}>
                <Dot id={p.id} at={lx(p.medianUs)} above={p.id === "recognizers" || p.id === "sugar"} />
              </div>
            ))}
            <p className="absolute -bottom-10 right-0 text-xs text-muted-foreground">median time per phrase, log scale →</p>
            <p className="absolute -left-10 -top-6 text-xs text-muted-foreground">right of 180</p>
          </div>
        </div>
        <div>
          <h2 className="font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">Sixty times slower for eight more</h2>
          <p className="mt-5 max-w-[46ch] text-muted-foreground">
            {rec.name} takes {fmtUs(rec.medianUs)} a phrase and got {rec.right} right. {chrono.name} takes {fmtUs(chrono.medianUs)} and got {chrono.right}.
            Parsing one phrase from a form, either is instant; parsing a million log lines, the gap is an afternoon.
          </p>
        </div>
      </div>
    </section>
  )
}

function Dot({ id, at, above }: { id: string; at: number; above?: boolean }) {
  const p = P.find((x) => x.id === id)!
  return (
    <span className={cn("flex items-center gap-1", above ? "flex-col-reverse" : "flex-col")}>
      <LibAvatar p={p} size={26} className="ring-2 ring-background" />
      <span className="whitespace-nowrap rounded bg-background/90 px-1 text-[11px] leading-tight" style={{ opacity: `clamp(0, calc((var(--p) - ${at.toFixed(4)}) * 14 + 0.15), 1)` }}>{p.name}</span>
    </span>
  )
}
