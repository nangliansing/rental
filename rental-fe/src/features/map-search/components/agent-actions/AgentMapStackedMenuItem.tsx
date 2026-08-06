import type { LucideIcon } from "lucide-react"
import { DropdownMenu } from "radix-ui"

import { cn } from "@/lib/utils"
import {
  DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
  DROPDOWN_MENU_ITEM_ICON_CLASSNAME,
  DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
  DROPDOWN_MENU_ITEM_TITLE_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"

type AgentMapStackedMenuItemProps = {
  icon: LucideIcon
  title: string
  description: string
  disabled?: boolean
  onSelect: () => void
}

const menuItemClassName = cn(
  DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
)

/** Shared Plus-menu row: icon + title + supporting description. */
export function AgentMapStackedMenuItem({
  icon: Icon,
  title,
  description,
  disabled = false,
  onSelect,
}: AgentMapStackedMenuItemProps) {
  return (
    <DropdownMenu.Item
      className={menuItemClassName}
      disabled={disabled}
      onSelect={(event) => {
        event.preventDefault()
        if (disabled) return
        onSelect()
      }}
    >
      <Icon
        className={cn("mt-0.5", DROPDOWN_MENU_ITEM_ICON_CLASSNAME)}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className={DROPDOWN_MENU_ITEM_TITLE_CLASSNAME}>{title}</span>
        <span className={DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME}>
          {description}
        </span>
      </span>
    </DropdownMenu.Item>
  )
}
