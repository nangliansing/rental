import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ReviewTeaserRowProps = {
  avatar: ReactNode
  text: ReactNode
  className?: string
  "aria-label"?: string
  "aria-busy"?: boolean
}

/** Shared avatar + text row used by loading, empty, and review teasers. */
export function ReviewTeaserRow({
  avatar,
  text,
  className,
  "aria-label": ariaLabel,
  "aria-busy": ariaBusy,
}: ReviewTeaserRowProps) {
  return (
    <div
      className={cn("flex items-center gap-2.5 px-4", className)}
      aria-label={ariaLabel}
      aria-busy={ariaBusy || undefined}
      role={ariaLabel ? "status" : undefined}
    >
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">{text}</div>
    </div>
  )
}
