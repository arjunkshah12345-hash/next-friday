// The measured results (bench/out/results.json, copied in at build time) and small formatting helpers.
import raw from "@/data/results.json"

export type Verdict = "ok" | "wrong" | "empty"
export type Parser = {
  id: string
  name: string
  lang: "JavaScript" | "Python"
  pkg: string
  version: string
  call: string
  right: number
  wrong: number
  empty: number
  invented: number
  nullsTotal: number
  confidentWrong: number
  medianUs: number
  us: number[]
  installKB: number
  weekly: number
  byCat: Record<string, number>
  verdict: Verdict[]
  answers: (string | null)[]
}
export type Case = { id: number; cat: string; text: string; accept: (string | null)[] }
export type Cat = { id: string; name: string; blurb: string }
export type Results = {
  meta: string
  measuredAt: string
  now: { iso: string; label: string }
  n: number
  cats: Cat[]
  cases: Case[]
  node: string
  python: string
  ranAt: string
  parsers: Parser[]
}

export const R = raw as unknown as Results
export const P = R.parsers
export const N = R.n
export const caseIndex = (text: string) => R.cases.findIndex((c) => c.text === text)

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11-06T09:30" → "Fri 6 Nov, 09:30" (the time only when it isn't midnight, the year only when it isn't 2026) */
export function fmtAnswer(a: string | null, withTime = true) {
  if (!a) return "nothing"
  if (a.length === 4) return a
  if (a.length === 7) return `${MO[+a.slice(5, 7) - 1]} ${a.slice(0, 4)}`
  const d = new Date(`${a.length === 10 ? `${a}T00:00` : a}:00Z`)
  const y = d.getUTCFullYear()
  const time = a.slice(11, 16)
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}${y !== 2026 ? ` ${y}` : ""}${withTime && time !== "00:00" ? `, ${time}` : ""}`
}

export function fmtUs(us: number) {
  return us < 1000 ? `${us < 10 ? us.toFixed(1) : Math.round(us)} µs` : `${(us / 1000).toFixed(1)} ms`
}
export function fmtKB(kb: number) {
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(kb < 10240 ? 1 : 0)} MB`
}
export function fmtCount(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)
}
/** a deterministic hue per library, so its avatar is the same everywhere */
export function hueOf(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
/** does an answer satisfy one accepted reading (same rule as bench/cases.mjs judge()) */
export const accepts = (accept: (string | null)[], got: string | null) =>
  accept.some((a) => (a === null ? got === null : got !== null && got.startsWith(a)))
