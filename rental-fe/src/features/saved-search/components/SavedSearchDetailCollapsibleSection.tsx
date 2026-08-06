import { useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type SavedSearchDetailCollapsibleSectionProps = {
  title: string
  /** Accessible name for the section landmark. Defaults to `title`. */
  ariaLabel?: string
  defaultOpen?: boolean
  /** Shown under the title only while the section is collapsed. */
  collapsedSummary?: string | null
  children: ReactNode
  className?: string
}

/** Shared disclosure chrome for saved-search detail sections. */
export function SavedSearchDetailCollapsibleSection({
  title,
  ariaLabel = title,
  defaultOpen = true,
  collapsedSummary = null,
  children,
  className,
}: SavedSearchDetailCollapsibleSectionProps) {
  const contentId = useId()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section aria-label={ariaLabel} className={cn("space-y-3", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-950">
            {title}
          </span>
          {!isOpen && collapsedSummary ? (
            <span className="mt-0.5 block text-xs text-slate-500">
              {collapsedSummary}
            </span>
          ) : null}
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
