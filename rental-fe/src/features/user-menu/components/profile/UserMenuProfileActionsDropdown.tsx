import type { ReactNode, RefObject } from "react"

import { cn } from "@/lib/utils"

type UserMenuProfileActionsDropdownProps = {
  id: string
  isOpen: boolean
  menuRef: RefObject<HTMLDivElement | null>
  className?: string
  children: ReactNode
}

export function UserMenuProfileActionsDropdown({
  id,
  isOpen,
  menuRef,
  className,
  children,
}: UserMenuProfileActionsDropdownProps) {
  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label="Account actions"
      className={cn(
        "absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}
