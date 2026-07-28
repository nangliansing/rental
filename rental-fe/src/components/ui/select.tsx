import * as React from "react"

import { cn } from "@/lib/utils"

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-950 transition-colors outline-none focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className,
      )}
      {...props}
    />
  )
}

export { Select }
