import { P, R, accepts, caseIndex, fmtAnswer } from "@/lib/bench"
import { useSeen } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { LibAvatar } from "./lib-badge"

/** Every distinct answer to one phrase, with the libraries that gave it. */
function Spread({ text, seen, order }: { text: string; seen: boolean; order: number }) {
  const i = caseIndex(text), c = R.cases[i]
  const groups = new Map<string, typeof P>()
  for (const p of P) { const a = p.answers[i] ?? "null"; groups.set(a, [...(groups.get(a) ?? []), p]) }
  const rows = [...groups.entries()].sort(([a], [b]) => (a === "null" ? 1 : b === "null" ? -1 : a.localeCompare(b)))
  return (
    <figure className={cn("border-t-2 border-foreground transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none", !seen && "translate-y-5 opacity-0")} style={{ transitionDelay: `${order * 110}ms` }}>
      <figcaption className="border-b py-3">
        <span className="font-mono text-[13px]">“{text}”</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {groups.size} different answers · the key accepts {c.accept.map((a) => fmtAnswer(a, a !== null && a.length > 10)).join(" or ")}
        </span>
      </figcaption>
      <ul className="divide-y text-sm">
        {rows.map(([a, ps]) => {
          const got = a === "null" ? null : a, ok = accepts(c.accept, got)
          return (
            <li key={a} className="flex items-center gap-3 py-2">
              <span className={cn("tnum min-w-0 flex-1", !got && "text-muted-foreground", got && !ok && "text-dither-red")}>{fmtAnswer(got)}</span>
              <span className="flex gap-1">{ps.map((p) => <LibAvatar key={p.id} p={p} size={18} />)}</span>
              <span className="w-4 text-center text-key" aria-label={ok ? "right" : "wrong"}>{ok ? "✓" : ""}</span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

export function Hardest() {
  const per = R.cases.map((c, i) => ({ c, n: P.filter((p) => p.verdict[i] === "ok").length }))
  const none = per.filter((x) => x.n === 0)
  const [cards, seen] = useSeen<HTMLDivElement>(0.2)
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-32 md:px-16">
      <div className="flex flex-col gap-5">
        <h2 className="max-w-[16ch] font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">Eleven libraries, eight answers</h2>
        <p className="max-w-[52ch] text-muted-foreground">
          Counting from a day that isn’t today split them most. “4 days from tomorrow” got eight different dates; several libraries read only
          “tomorrow” and dropped the rest.
        </p>
      </div>
      <div ref={cards} className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-3">
        <Spread text="4 days from tomorrow" seen={seen} order={0} />
        <Spread text="a week from today" seen={seen} order={1} />
        <Spread text="Let's have lunch tomorrow around 1." seen={seen} order={2} />
      </div>
      <p className="mt-6 max-w-[80ch] text-sm text-muted-foreground">
        No library got these {none.length}:{" "}
        {none.map((x, k) => <span key={x.c.id}><span className="font-mono text-foreground">“{x.c.text}”</span>{k < none.length - 1 ? ", " : "."}</span>)}
      </p>
    </section>
  )
}

export function NotADate() {
  const idx = R.cases.map((c, i) => (c.accept.includes(null) ? i : -1)).filter((i) => i >= 0)
  const dj = P.find((p) => p.id === "datejs")!
  return (
    <section className="mx-auto max-w-[1280px] px-5 pt-32 md:px-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]">
        <div className="md:sticky md:top-10 md:self-start">
          <h2 className="font-serif text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none tracking-[-0.015em]">Sun Microsystems is a Sunday</h2>
          <p className="mt-5 max-w-[44ch] text-muted-foreground">
            Nineteen phrases have no date in them, or name one that doesn’t exist. Four libraries read “Sun” as a Sunday, seven read “10/10” as
            10 October, and three turned “Room 1104” into the year 1104. date.js returned a date for {dj.invented} of the {dj.nullsTotal}.
          </p>
          <p className="mt-4 max-w-[44ch] text-muted-foreground">If your input might not be a date at all, test what your parser does with nonsense before you trust what it does with dates.</p>
        </div>
        <div className="relative overflow-x-auto border-y border-foreground/15">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Phrases with no valid date, and the libraries that returned one anyway</caption>
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="px-4 py-2 font-normal">Phrase</th><th scope="col" className="px-4 py-2 font-normal">Returned a date anyway</th></tr></thead>
            <tbody className="divide-y">
              {idx.map((i) => {
                const c = R.cases[i], who = P.filter((p) => p.answers[i])
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 align-top font-mono text-[13px]">{c.text}</td>
                    <td className="px-4 py-2">
                      {who.length === 0 ? <span className="text-muted-foreground">nobody</span> : (
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {who.map((p) => (
                            <span key={p.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <LibAvatar p={p} size={16} /><span className="tnum text-dither-red">{fmtAnswer(p.answers[i], false)}</span><span className="sr-only"> from {p.name}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
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
