import type { RefObject } from "react"
import { Search } from "lucide-react"

type MobilePlaceSearchButtonProps = {
  label?: string
  buttonRef?: RefObject<HTMLButtonElement | null>
  onClick: () => void
}

export function MobilePlaceSearchButton({
  label,
  buttonRef,
  onClick,
}: MobilePlaceSearchButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="flex h-12 w-full items-center justify-start gap-2 rounded-full border border-slate-200 bg-white px-4 text-left text-sm text-slate-600 shadow-lg md:hidden"
      onClick={onClick}
    >
      <Search className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="truncate">
        {label?.trim() || "Search place, mall, BTS, university"}
      </span>
    </button>
  )
}
