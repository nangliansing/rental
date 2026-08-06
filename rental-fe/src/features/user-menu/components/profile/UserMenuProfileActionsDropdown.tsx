import type { ReactNode, RefObject } from "react"

import { cn } from "@/lib/utils"
import { DROPDOWN_MENU_CONTENT_CLASSNAME } from "@/shared/components/menus/dropdownMenuStyles"

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
        "absolute right-0 top-full z-20 mt-1",
        DROPDOWN_MENU_CONTENT_CLASSNAME,
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
