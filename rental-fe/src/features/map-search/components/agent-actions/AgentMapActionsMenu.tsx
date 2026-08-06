import { memo, useState } from "react"
import { DropdownMenu } from "radix-ui"
import { Bookmark, ListPlus, Plus } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  DROPDOWN_MENU_CONTENT_CLASSNAME,
  DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
  DROPDOWN_MENU_ITEM_ICON_CLASSNAME,
  DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
  DROPDOWN_MENU_ITEM_TITLE_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"
import { getModalRoot } from "@/shared/utils/getModalRoot"

import { useMapSearchControls } from "../../context/MapSearchSessionContext"
import { useSaveMapSearch } from "../../hooks/useSaveMapSearch"
import { MAP_CONTROL_BUTTON_CLASS_NAME } from "../map-control-styles"
import {
  MAP_ACTIONS_TRIGGER,
  MAP_LISTING_MODE_ACTION,
  MAP_SAVE_SEARCH_ACTION,
} from "./agentMapActionsCopy"
import { ConfirmCreateClientRequestModal } from "./ConfirmCreateClientRequestModal"

const menuItemClassName = cn(
  DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
)

export const AgentMapActionsMenu = memo(function AgentMapActionsMenu() {
  const {
    canCreateListing,
    isListingSearch,
    onEnterListingSearch,
    onExitListingSearch,
  } = useMapSearchControls()
  const {
    canSaveSearch,
    openSaveSearch,
    closeSaveSearch,
    requestSnapshot,
    submittedFilters,
    isSaveSearchOpen,
  } = useSaveMapSearch()

  const [menuOpen, setMenuOpen] = useState(false)
  const isListingModeDisabled = !canCreateListing && !isListingSearch

  if (!canSaveSearch) return null

  const handleToggleListingMode = () => {
    if (isListingModeDisabled) return

    if (isListingSearch) {
      onExitListingSearch()
    } else {
      onEnterListingSearch()
    }
    setMenuOpen(false)
  }

  const handleOpenCreateRequest = () => {
    setMenuOpen(false)
    openSaveSearch()
  }

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={cn(
                  MAP_CONTROL_BUTTON_CLASS_NAME,
                  "border-slate-200 text-slate-700",
                  menuOpen &&
                    "border-slate-950 bg-slate-950 text-white ring-2 ring-slate-950 ring-offset-2 hover:bg-slate-800",
                )}
                aria-label={MAP_ACTIONS_TRIGGER.ariaLabel}
                data-testid="agent-map-actions"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
          </TooltipTrigger>
          <TooltipContent side="left">
            {MAP_ACTIONS_TRIGGER.tooltip}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu.Portal container={getModalRoot()}>
          <DropdownMenu.Content
            side="left"
            align="end"
            sideOffset={10}
            collisionPadding={16}
            className={cn(
              "z-[70] w-[min(17.5rem,calc(100vw-5rem))] max-w-[calc(100vw-5rem)]",
              DROPDOWN_MENU_CONTENT_CLASSNAME,
            )}
            aria-label={MAP_ACTIONS_TRIGGER.menuAriaLabel}
          >
            <DropdownMenu.Item
              className={menuItemClassName}
              disabled={isListingModeDisabled}
              onSelect={(event) => {
                event.preventDefault()
                if (isListingModeDisabled) return
                handleToggleListingMode()
              }}
            >
              <ListPlus
                className={cn("mt-0.5", DROPDOWN_MENU_ITEM_ICON_CLASSNAME)}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className={DROPDOWN_MENU_ITEM_TITLE_CLASSNAME}>
                  {isListingSearch
                    ? MAP_LISTING_MODE_ACTION.exitTitle
                    : MAP_LISTING_MODE_ACTION.enterTitle}
                </span>
                <span className={DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME}>
                  {isListingModeDisabled
                    ? MAP_LISTING_MODE_ACTION.requiresProfileDescription
                    : isListingSearch
                      ? MAP_LISTING_MODE_ACTION.exitDescription
                      : MAP_LISTING_MODE_ACTION.enterDescription}
                </span>
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={menuItemClassName}
              onSelect={(event) => {
                event.preventDefault()
                handleOpenCreateRequest()
              }}
            >
              <Bookmark
                className={cn("mt-0.5", DROPDOWN_MENU_ITEM_ICON_CLASSNAME)}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className={DROPDOWN_MENU_ITEM_TITLE_CLASSNAME}>
                  {MAP_SAVE_SEARCH_ACTION.title}
                </span>
                <span className={DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME}>
                  {MAP_SAVE_SEARCH_ACTION.description}
                </span>
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Arrow className="fill-white" />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmCreateClientRequestModal
        isOpen={isSaveSearchOpen}
        snapshot={requestSnapshot}
        filters={submittedFilters}
        onClose={closeSaveSearch}
      />
    </>
  )
})
