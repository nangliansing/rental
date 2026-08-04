import type { ReactNode } from "react"

import {
  DialogDescription,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"
import { cn } from "@/lib/utils"

type ClientRequestFormHeaderProps = {
  title: string
  description: string
  /**
   * Use Radix dialog heading semantics inside DialogShell.
   * Prefer `"page"` for create / edit routes.
   */
  semantics?: "dialog" | "page"
  className?: string
}

export function ClientRequestFormHeader({
  title,
  description,
  semantics = "page",
  className,
}: ClientRequestFormHeaderProps) {
  let heading: ReactNode
  let body: ReactNode

  if (semantics === "dialog") {
    heading = (
      <DialogTitle className="text-xl font-semibold text-slate-950">
        {title}
      </DialogTitle>
    )
    body = (
      <DialogDescription className="mt-1 text-sm text-slate-500">
        {description}
      </DialogDescription>
    )
  } else {
    heading = (
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
    )
    body = <p className="mt-1 text-sm text-slate-500">{description}</p>
  }

  return (
    <div className={cn("border-b border-slate-200 p-5", className)}>
      {heading}
      {body}
    </div>
  )
}
