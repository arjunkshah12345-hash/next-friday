import { DitherAvatar } from "@/components/dither-kit/avatar"
import { hueOf, type Parser } from "@/lib/bench"
import { cn } from "@/lib/utils"

/** A library's generative avatar: the same pixels for the same name, everywhere on the page. */
export function LibAvatar({ p, size = 24, className }: { p: Pick<Parser, "id" | "name">; size?: number; className?: string }) {
  return (
    <span className={cn("lib-avatar inline-block shrink-0 overflow-hidden rounded-[4px]", className)} style={{ width: size, height: size }} title={p.name}>
      <DitherAvatar name={p.name} hue={hueOf(p.id)} size={size} bloom="off" />
    </span>
  )
}

export function LibName({ p, size = 24, sub = true }: { p: Parser; size?: number; sub?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <LibAvatar p={p} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{p.name}</span>
        {sub && <span className="block text-xs text-muted-foreground">{p.lang} · {p.version}</span>}
      </span>
    </span>
  )
}
