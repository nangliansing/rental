import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type TypeaheadStatusProps = {
  children: ReactNode
  visuallyHidden?: boolean
}

export function TypeaheadStatus({
  children,
  visuallyHidden = false,
}: TypeaheadStatusProps) {
  return (
    <p
      className={cn(
        visuallyHidden
          ? "sr-only"
          : "px-3 py-6 text-center text-sm text-slate-500",
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </p>
  )
}
