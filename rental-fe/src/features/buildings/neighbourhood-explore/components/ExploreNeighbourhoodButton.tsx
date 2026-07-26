import { Compass } from "lucide-react"

import {
  FOOTER_ICON_BUTTON_CLASSNAME,
  FOOTER_ICON_PROPS,
} from "@/features/contacts/utils/contactPresentation"
import { cn } from "@/lib/utils"

type ExploreNeighbourhoodButtonProps = {
  variant?: "footer" | "pill"
  isOpen?: boolean
  onClick: (trigger: HTMLButtonElement) => void
}

export function ExploreNeighbourhoodButton({
  variant = "pill",
  isOpen = false,
  onClick,
}: ExploreNeighbourhoodButtonProps) {
  if (variant === "footer") {
    return (
      <button
        type="button"
        className={FOOTER_ICON_BUTTON_CLASSNAME}
        aria-label="Explore neighbourhood"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(event) => onClick(event.currentTarget)}
      >
        <Compass aria-hidden="true" {...FOOTER_ICON_PROPS} />
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
      )}
      aria-label="Explore neighbourhood"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={(event) => onClick(event.currentTarget)}
    >
      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
      Explore
    </button>
  )
}
