import { useEffect, useMemo, useRef, useState } from "react"
import { DitherButton } from "@/components/dither-kit/button"
import { DitherGradient } from "@/components/dither-kit/gradient"
import { DitherFade } from "@/components/dithercn/dither-fade"
import { ditherMaskStyle, useInView, usePrefersReducedMotion } from "@/lib/dither"
import { P, R, accepts, caseIndex, fmtAnswer } from "@/lib/bench"
import { delay } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { LibAvatar } from "./lib-badge"

// Phrases whose answers land inside the five weeks shown
const PICKS = [
  "next Friday",
  "this weekend",
  "Thursday after next",
  "a week from today",
  "4 days from tomorrow",
  "two weeks from tomorrow",
  "last Monday",
  "a week on Friday",
  "Deadline: end of next week",
  "Your parcel will arrive in 3 working days",
]
const START = Date.UTC(2026, 9, 19) // Monday 19 October 2026, five weeks
const DAYS = Array.from({ length: 35 }, (_, i) => new Date(START + i * 864e5))
const TODAY = R.now.iso.slice(0, 10)
const key = (d: Date) => d.toISOString().slice(0, 10)

export function Hero() {
  const [text, setText] = useState(PICKS[0])
  // The calendar cycles through the phrases on its own until the reader picks one or pauses it
  const reduce = usePrefersReducedMotion()
  const [auto, setAuto] = useState(true)
  const [held, setHeld] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const inView = useInView(card, { rootMargin: "0px" })
  const cycling = auto && !reduce
  const next = () => setText((t) => PICKS[(PICKS.indexOf(t) + 1) % PICKS.length])
  // On a phone the chips scroll sideways: keep the current one in sight without moving the page
  const chips = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = chips.current, on = row?.querySelector<HTMLElement>("[aria-pressed=true]")
    if (!row || !on || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: on.offsetLeft - 12, behavior: reduce ? "auto" : "smooth" })
  }, [text, reduce])
  const i = caseIndex(text)
  const c = R.cases[i]

  const { byDay, elsewhere, accepted } = useMemo(() => {
    const byDay = new Map<string, typeof P>()
    const elsewhere: typeof P = []
    for (const p of P) {
      const a = p.answers[i]
      const d = a?.slice(0, 10)
      if (d && DAYS.some((x) => key(x) === d)) byDay.set(d, [...(byDay.get(d) ?? []), p])
      else elsewhere.push(p)
    }
    const accepted = new Set(c.accept.filter((a): a is string => !!a && a.length >= 10).map((a) => a.slice(0, 10)))
    return { byDay, elsewhere, accepted }
  }, [i, c])

  const right = P.filter((p) => p.verdict[i] === "ok").length

  return (
    <section id="top" className="relative overflow-hidden pb-20 md:pb-28">
      {/* a blue dither floor the calendar stands on, full width */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%]"><DitherGradient from="blue" direction="up" opacity={0.5} cell={4} /><DitherFade side="bottom" size={90} cell={4} color="oklch(0.984 0.003 95)" /></div>
      <div className="relative mx-auto max-w-[1280px] px-5 pt-16 md:px-16 md:pt-24">
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-end">
        <h1 className="font-serif text-[clamp(3rem,1.6rem+5vw,6.25rem)] leading-[0.95] tracking-[-0.02em]">Which Friday is next Friday?</h1>
        <div>
          <p className="max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
            We gave 11 date-parsing libraries the same 180 phrases at 14:30 on Wednesday 28 October 2026. For “next Friday”, six said 6 November,
            three said 30 October and two returned nothing.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <DitherButton color="grey" variant="solid" className="h-11 bg-foreground px-5 font-sans text-sm font-medium text-white" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>See the results</DitherButton>
            <a className="inline-flex min-h-11 items-center text-sm underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground" href="data/results.json" download>Download every answer (JSON)</a>
          </div>
        </div>
      </div>

      <div ref={card} data-inview className="mt-14 rounded-xl border bg-card shadow-[0_40px_90px_-50px_rgb(0_0_0/0.45)]"
        onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
        <div ref={chips} className="flex items-center gap-2 relative overflow-x-auto border-b p-3 [scrollbar-width:none] md:flex-wrap" role="group" aria-label="Pick a phrase">
          {PICKS.map((t) => (
            <button key={t} type="button" onClick={() => { setText(t); setAuto(false) }} aria-pressed={t === text}
              className={cn("relative h-9 shrink-0 overflow-hidden whitespace-nowrap rounded-full px-3.5 font-mono text-[13px] transition-colors duration-200 motion-reduce:transition-none", t === text ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {t}
              {t === text && cycling && (
                <span key={t} aria-hidden onAnimationEnd={next} className="nf-tick absolute inset-x-3 bottom-1 h-px bg-background/70"
                  style={{ animationPlayState: inView && !held ? "running" : "paused" }} />
              )}
            </button>
          ))}
          {!reduce && (
            <button type="button" onClick={() => setAuto((a) => !a)} aria-pressed={!auto}
              className="sticky right-0 ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card px-3 text-xs text-muted-foreground shadow-[-12px_0_12px_var(--card),12px_0_0_var(--card)] hover:bg-muted hover:text-foreground md:static md:shadow-none">
              <span aria-hidden className="tnum font-mono">{auto ? "❙❙" : "▶"}</span>{auto ? "Pause" : "Cycle phrases"}
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-3 md:p-5" role="img" aria-label={`Calendar for October and November 2026. For “${text}”, the 11 libraries landed on: ${P.map((p) => `${p.name} ${fmtAnswer(p.answers[i], false)}`).join("; ")}.`}>
            <div className="grid grid-cols-7 gap-1 pb-2 text-xs text-muted-foreground" aria-hidden>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="px-2">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1" aria-hidden>
              {DAYS.map((d) => {
                const k = key(d), who = byDay.get(k) ?? [], ok = accepted.has(k)
                const first = d.getUTCDate() === 1
                return (
                  <div key={k} className={cn("relative h-[clamp(52px,6.4vw,92px)] overflow-hidden rounded-md bg-muted/60 transition-shadow duration-300 motion-reduce:transition-none", ok && "ring-2 ring-key ring-inset")}>
                    {who.length > 0 && <div key={text} className="nf-fade absolute inset-0 bg-dither-ink" style={ditherMaskStyle(Math.min(0.85, who.length / 11 * 0.8 + 0.06), { cell: 4 })} />}
                    <span className={cn("absolute left-1.5 top-1.5 rounded px-1 font-serif text-[clamp(1rem,.7rem+1vw,1.75rem)] leading-none", who.length ? "bg-card" : "", k < TODAY ? "text-muted-foreground" : "")}>
                      {first ? `${d.getUTCDate()} ${d.getUTCMonth() === 9 ? "Oct" : "Nov"}` : d.getUTCDate()}
                    </span>
                    {k === TODAY && <span className="absolute right-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">now</span>}
                    {who.length > 0 && (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-0.5">
                        {who.map((p, n) => (
                          <span key={`${text}-${p.id}`} className="nf-pop" style={delay(120 + n * 45)}><LibAvatar p={p} size={16} className="ring-1 ring-card" /></span>
                        ))}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 max-w-[62ch] text-[13px] text-muted-foreground">
              Denser dots, more libraries chose that day. Days outlined in blue are what the answer key accepts. {elsewhere.length > 0 && `Not on this calendar: ${elsewhere.map((p) => `${p.name} (${fmtAnswer(p.answers[i], false)})`).join(", ")}.`}
            </p>
          </div>

          <div className="border-t md:border-l md:border-t-0">
            <p className="flex items-baseline justify-between border-b px-4 py-3 text-sm">
              <span className="font-mono">“{text}”</span>
              <span className="tnum text-muted-foreground">{right}/11 right</span>
            </p>
            <ul className="divide-y text-sm">
              {P.map((p, n) => {
                const a = p.answers[i], ok = accepts(c.accept, a)
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                    <LibAvatar p={p} size={20} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span key={text} className="flex items-center gap-3 nf-rise" style={delay(n * 28)}>
                      <span className={cn("tnum whitespace-nowrap", !a && "text-muted-foreground", a && !ok && "text-dither-red")}>{fmtAnswer(a)}</span>
                      <span aria-label={ok ? "right" : "wrong"} className={cn("w-4 text-center", ok ? "text-key" : "text-dither-red")}>{ok ? "✓" : "✗"}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}
