import { useEffect, useMemo, useState } from "react"
import { BarChart } from "@/components/dither-kit/bar-chart"
import type { ChartConfig } from "@/components/dither-kit/chart-context"
import { Bar } from "@/components/dither-kit/bar"
import { Grid } from "@/components/dither-kit/grid"
import { Legend } from "@/components/dither-kit/legend"
import { Tooltip } from "@/components/dither-kit/tooltip"
import { XAxis } from "@/components/dither-kit/x-axis"
import { YAxis } from "@/components/dither-kit/y-axis"
import { DitherNumber } from "@/components/dithercn/dither-number"
import { ProgressBar } from "@/components/dithercn/progress-bar"
import { N, P, fmtCount, fmtKB, fmtUs, type Parser } from "@/lib/bench"
import { useFlip, useSeen } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { LibName } from "./lib-badge"

type Col = { key: keyof Parser; label: string; dir: 1 | -1; num?: boolean }
const COLS: Col[] = [
  { key: "right", label: "Right of 180", dir: -1 },
  { key: "wrong", label: "Wrong", dir: 1, num: true },
  { key: "empty", label: "Nothing", dir: 1, num: true },
  { key: "invented", label: "Invented", dir: 1, num: true },
  { key: "medianUs", label: "Median time", dir: 1, num: true },
  { key: "installKB", label: "Install", dir: 1, num: true },
  { key: "weekly", label: "Weekly downloads", dir: -1, num: true },
]

export function Leaderboard() {
  const [sort, setSort] = useState<{ key: keyof Parser; dir: 1 | -1 }>({ key: "right", dir: -1 })
  const rows = useMemo(() => P.slice().sort((a, b) => sort.dir * ((a[sort.key] as number) - (b[sort.key] as number))), [sort])
  const top = P[0]
  const [table, seen] = useSeen<HTMLDivElement>(0.2)
  const body = useFlip<HTMLTableSectionElement>(sort)

  return (
    <section id="results" className="mx-auto max-w-[1280px] scroll-mt-8 px-5 pt-32 md:px-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="font-serif leading-none tracking-[-0.015em]"><DitherNumber value={top.right} trigger="in-view" accent="blue" duration={1400} stagger={90} className="tnum block text-[clamp(7rem,2rem+16vw,15rem)] leading-[1.1] tracking-[-0.04em] -my-[0.08em]" /><span className="sr-only">{top.right}</span><span className="mt-3 block text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)]">of 180, the best score</span></h2>
        <p className="max-w-[52ch] text-muted-foreground">
          {top.name} read the most phrases right, two ahead of compromise-dates and eight ahead of chrono-node, which is 60 times faster.
          No library cleared 80%.
        </p>
      </div>

      <div ref={table} className="mt-12 relative overflow-x-auto border-y border-foreground/15">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <caption className="sr-only">Eleven date parsers on 180 phrases. Sort by any column.</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="w-10 px-4 py-3 font-normal">#</th>
              <th scope="col" className="px-4 py-3 font-normal">Library</th>
              {COLS.map((c) => {
                const on = sort.key === c.key
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (sort.dir === -1 ? "descending" : "ascending") : undefined} className={cn("px-4 py-3 font-normal", c.num && "text-right")}>
                    <button type="button" onClick={() => setSort({ key: c.key, dir: on ? (-sort.dir as 1 | -1) : c.dir })} className={cn("inline-flex min-h-8 items-center gap-1 hover:text-foreground", on && "text-foreground")}>
                      {c.label}<span aria-hidden className={on ? "" : "opacity-40"}>{on ? (sort.dir === -1 ? "↓" : "↑") : "↕"}</span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody ref={body} className="divide-y">
            {rows.map((p, r) => (
              <tr key={p.id} data-flip={p.id} className="relative hover:bg-muted/40">
                <td className="tnum px-4 py-3 text-muted-foreground">{r + 1}</td>
                <th scope="row" className="px-4 py-3 text-left font-normal"><LibName p={p} size={28} /></th>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="tnum w-9 text-right text-base font-medium">{p.right}</span>
                    <span className="block w-full min-w-[160px]" aria-hidden>
                      <ProgressBar label={`${p.name}, right`} hideLabel value={seen ? p.right : 0} max={N} color={P.indexOf(p) === 0 ? "blue" : "ink"} fill="gradient" size="md" />
                    </span>
                  </span>
                </td>
                <td className="tnum px-4 py-3 text-right">{p.wrong}</td>
                <td className="tnum px-4 py-3 text-right">{p.empty}</td>
                <td className={cn("tnum px-4 py-3 text-right", p.invented >= 10 && "text-dither-red")}>{p.invented}<span className="text-muted-foreground">/{p.nullsTotal}</span></td>
                <td className="tnum px-4 py-3 text-right">{fmtUs(p.medianUs)}</td>
                <td className="tnum px-4 py-3 text-right">{fmtKB(p.installKB)}</td>
                <td className="tnum px-4 py-3 text-right">{fmtCount(p.weekly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground">
        Wrong is a date that isn’t any accepted reading. Nothing is no answer at all. Invented counts dates returned for the 19 phrases that have none.
        Median time is per phrase, measured in each library’s own runtime (Node {"25.3"} or Python 3.13) on one Apple-silicon Mac, so compare within a language before across.
        Install is the size on disk with dependencies; downloads are the last seven days on npm or PyPI.
      </p>
    </section>
  )
}

const short = (n: string) => n.replace("-Text", "").replace("compromise-dates", "compromise").replace("any-date-parser", "any-date")

export function Outcomes() {
  const data = P.map((p) => ({ name: short(p.name), right: p.right, wrong: p.wrong, nothing: p.empty }))
  const config: ChartConfig = { right: { label: "Right", color: "blue" }, wrong: { label: "Wrong", color: "red" }, nothing: { label: "Nothing", color: "grey" } }
  const dp = P.find((p) => p.id === "dateparser")!, dj = P.find((p) => p.id === "datejs")!
  // The bars grow when the chart scrolls into view, not on page load where nobody sees it
  const [box, seen] = useSeen<HTMLDivElement>(0.4)
  const [replay, setReplay] = useState(0)
  useEffect(() => { if (seen) setReplay(1) }, [seen])
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-32 md:px-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:items-center">
        <div>
          <h2 className="font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">Saying nothing beats guessing</h2>
          <p className="mt-5 max-w-[46ch] text-muted-foreground">
            dateparser returned a wrong date only {dp.wrong} times; when it couldn’t read a phrase it said so, {dp.empty} times. date.js almost never says nothing
            ({dj.empty} times) and was wrong {dj.wrong} times, because it hands back the current time when it can’t read the input.
          </p>
          <p className="mt-4 max-w-[46ch] text-muted-foreground">An empty answer lets your app ask again. A wrong one books the meeting.</p>
        </div>
        <div ref={box} className={cn("h-[440px] border-y border-foreground/15 py-5 transition-opacity duration-300 motion-reduce:transition-none", !seen && "opacity-0")} role="img" aria-label={`Stacked bars of right, wrong and empty answers for each library. ${P.map((p) => `${p.name}: ${p.right} right, ${p.wrong} wrong, ${p.empty} nothing`).join("; ")}.`}>
          <BarChart data={data} config={config} stackType="stacked" bloom="off" animate replayToken={replay} margins={{ top: 40 }}>
            <Grid horizontal />
            <XAxis dataKey="name" />
            <YAxis tickCount={4} />
            <Legend align="left" />
            <Tooltip labelKey="name" />
            <Bar dataKey="right" variant="solid" />
            <Bar dataKey="wrong" variant="hatched" />
            <Bar dataKey="nothing" variant="dotted" />
          </BarChart>
        </div>
      </div>
    </section>
  )
}
