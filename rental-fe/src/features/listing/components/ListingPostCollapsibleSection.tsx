import { useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type ListingPostCollapsibleSectionProps = {
  title: string
  /** Accessible name for the section landmark. Defaults to `title`. */
  ariaLabel?: string
  defaultOpen?: boolean
  /** Controlled open state. When set, pair with `onOpenChange`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: ReactNode
}

/** Shared disclosure chrome for listing post body sections. */
export function ListingPostCollapsibleSection({
  title,
  ariaLabel = title,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  children,
}: ListingPostCollapsibleSectionProps) {
  const contentId = useId()
  const isControlled = open !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = isControlled ? open : uncontrolledOpen

  const setIsOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (!isControlled) setUncontrolledOpen(next)
  }

  return (
    <section
      aria-label={ariaLabel}
      className={cn("border-t border-slate-100 pt-2", className)}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 py-1 text-left"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="min-w-0 text-sm font-semibold text-slate-950">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? <div id={contentId}>{children}</div> : null}
    </section>
  )
}
