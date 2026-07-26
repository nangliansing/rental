import { ChevronLeft, X } from "lucide-react"
import type { MouseEvent } from "react"

import { cn } from "@/lib/utils"

type ModalDismissHeaderProps = {
  onClose: () => void
  closeLabel?: string
  className?: string
}

export function ModalDismissHeader({
  onClose,
  closeLabel = "Close",
  className,
}: ModalDismissHeaderProps) {
  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onClose()
  }

  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3",
        className,
      )}
    >
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        aria-label={closeLabel}
        onClick={handleClose}
      >
        <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" strokeWidth={2.25} />
        <span className="hidden md:inline">{closeLabel}</span>
      </button>

      <button
        type="button"
        className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:flex"
        aria-label={closeLabel}
        onClick={handleClose}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
