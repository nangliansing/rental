import { Settings } from "lucide-react"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

type UserMenuProfileActionsTriggerProps = {
  isOpen: boolean
  menuId: string
  isDisabled?: boolean
  onToggle: () => void
  className?: string
}

export const UserMenuProfileActionsTrigger = forwardRef<
  HTMLButtonElement,
  UserMenuProfileActionsTriggerProps
>(function UserMenuProfileActionsTrigger(
  { isOpen, menuId, isDisabled = false, onToggle, className },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      aria-label="Account actions"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={menuId}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <Settings aria-hidden="true" className="h-4 w-4" />
    </button>
  )
})
