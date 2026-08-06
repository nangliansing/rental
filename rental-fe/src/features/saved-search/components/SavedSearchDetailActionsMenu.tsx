import { useState } from "react"
import { DropdownMenu } from "radix-ui"
import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import type { SavedSearchStatus } from "@/features/saved-search/api"
import { cn } from "@/lib/utils"
import { useModalPortalContainer } from "@/shared/components/ModalPortalHost"
import {
  DROPDOWN_MENU_CONTENT_CLASSNAME,
  DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
  DROPDOWN_MENU_ITEM_ICON_CLASSNAME,
  DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"

type SavedSearchDetailActionsMenuProps = {
  status: SavedSearchStatus
  disabled?: boolean
  onEditRequest: () => void
  onCloseRequest: () => void
  onDeleteRequest: () => void
}

const menuItemClassName = cn(
  DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
)

export function SavedSearchDetailActionsMenu({
  status,
  disabled = false,
  onEditRequest,
  onCloseRequest,
  onDeleteRequest,
}: SavedSearchDetailActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const portalContainer = useModalPortalContainer()
  const isClosed = status === "Closed"

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
            "outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label="Saved search actions"
          disabled={disabled}
          data-testid="saved-search-detail-actions"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal container={portalContainer}>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn("z-[1200]", DROPDOWN_MENU_CONTENT_CLASSNAME)}
          aria-label="Saved search actions"
        >
          <DropdownMenu.Item
            className={menuItemClassName}
            disabled={isClosed}
            onSelect={(event) => {
              event.preventDefault()
              if (isClosed) return
              setOpen(false)
              onEditRequest()
            }}
          >
            <Pencil
              className={DROPDOWN_MENU_ITEM_ICON_CLASSNAME}
              aria-hidden="true"
            />
            <span>Edit</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={menuItemClassName}
            disabled={isClosed}
            onSelect={(event) => {
              event.preventDefault()
              if (isClosed) return
              setOpen(false)
              onCloseRequest()
            }}
          >
            <CheckCircle2
              className={DROPDOWN_MENU_ITEM_ICON_CLASSNAME}
              aria-hidden="true"
            />
            <span>{isClosed ? "Closed" : "Close"}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
              DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
            )}
            onSelect={(event) => {
              event.preventDefault()
              setOpen(false)
              onDeleteRequest()
            }}
          >
            <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Delete</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
