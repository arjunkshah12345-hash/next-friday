import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { usePrefersReducedMotion } from "@/lib/dither"

/** True from the first time the element is well inside the viewport; true at once under reduced motion. */
export function useSeen<T extends Element>(threshold = 0.25): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const reduce = usePrefersReducedMotion()
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, threshold])
  return [ref, seen || reduce]
}

/**
 * Writes scroll progress through the element to `--p` (0 when its top reaches `from` of the viewport height,
 * 1 when it reaches `to`). No re-renders; 1 under reduced motion.
 */
export function useScrollProgress<T extends HTMLElement>(from = 0.95, to = 0.3): RefObject<T | null> {
  const ref = useRef<T>(null)
  const reduce = usePrefersReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) { el.style.setProperty("--p", "1"); return }
    let raf = 0
    const update = () => {
      raf = 0
      const top = el.getBoundingClientRect().top / innerHeight
      const p = Math.min(1, Math.max(0, (from - top) / (from - to)))
      el.style.setProperty("--p", p.toFixed(4))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf) }
  }, [from, to, reduce])
  return ref
}

/** FLIP: children marked data-flip slide from where they were to where they are whenever `dep` changes. */
export function useFlip<T extends HTMLElement>(dep: unknown): RefObject<T | null> {
  const ref = useRef<T>(null)
  const last = useRef(new Map<string, number>())
  const reduce = usePrefersReducedMotion()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const now = new Map<string, number>()
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((row) => {
      const id = row.dataset.flip!, top = row.getBoundingClientRect().top
      now.set(id, top)
      const was = last.current.get(id)
      if (reduce || was === undefined || was === top) return
      row.animate([{ transform: `translateY(${was - top}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" })
    })
    last.current = now
  }, [dep, reduce])
  return ref
}

/** Stagger delay for the .nf-* keyframe classes. */
export const delay = (ms: number) => ({ "--d": `${Math.round(ms)}ms` }) as CSSProperties
