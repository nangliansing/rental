import { memo, useState } from "react"
import { DropdownMenu } from "radix-ui"
import { Bookmark, ListPlus, Plus, Radar } from "lucide-react"

import {
  EXPLORE_OPPORTUNITIES_ACTION,
  ExploreOpportunitiesPanelModal,
} from "@/features/explore-opportunities-panel"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { DROPDOWN_MENU_CONTENT_CLASSNAME } from "@/shared/components/menus/dropdownMenuStyles"
import { getModalRoot } from "@/shared/utils/getModalRoot"

import { useMapSearchControls } from "../../context/MapSearchSessionContext"
import { useExploreMapOpportunities } from "../../hooks/useExploreMapOpportunities"
import { useSaveMapSearch } from "../../hooks/useSaveMapSearch"
import { MAP_CONTROL_BUTTON_CLASS_NAME } from "../map-control-styles"
import {
  MAP_ACTIONS_TRIGGER,
  MAP_LISTING_MODE_ACTION,
  MAP_SAVE_SEARCH_ACTION,
} from "./agentMapActionsCopy"
import { AgentMapStackedMenuItem } from "./AgentMapStackedMenuItem"
import { ConfirmCreateSavedSearchModal } from "./ConfirmCreateSavedSearchModal"

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
    savedSearchSnapshot,
    submittedFilters,
    isSaveSearchOpen,
  } = useSaveMapSearch()
  const {
    canExploreOpportunities,
    openExploreOpportunities,
    closeExploreOpportunities,
    exploreSession,
    isExploreOpportunitiesOpen,
  } = useExploreMapOpportunities()

  const [menuOpen, setMenuOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const isListingModeDisabled = !canCreateListing && !isListingSearch
  const suppressTooltip =
    menuOpen || isExploreOpportunitiesOpen || isSaveSearchOpen

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
    setTooltipOpen(false)
    openSaveSearch()
  }

  const handleOpenExploreOpportunities = () => {
    if (!canExploreOpportunities) return
    setMenuOpen(false)
    setTooltipOpen(false)
    openExploreOpportunities()
  }

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip
          open={suppressTooltip ? false : tooltipOpen}
          onOpenChange={(open) => {
            if (suppressTooltip) {
              setTooltipOpen(false)
              return
            }
            setTooltipOpen(open)
          }}
        >
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
            <AgentMapStackedMenuItem
              icon={ListPlus}
              title={
                isListingSearch
                  ? MAP_LISTING_MODE_ACTION.exitTitle
                  : MAP_LISTING_MODE_ACTION.enterTitle
              }
              description={
                isListingModeDisabled
                  ? MAP_LISTING_MODE_ACTION.requiresProfileDescription
                  : isListingSearch
                    ? MAP_LISTING_MODE_ACTION.exitDescription
                    : MAP_LISTING_MODE_ACTION.enterDescription
              }
              disabled={isListingModeDisabled}
              onSelect={handleToggleListingMode}
            />

            <AgentMapStackedMenuItem
              icon={Bookmark}
              title={MAP_SAVE_SEARCH_ACTION.title}
              description={MAP_SAVE_SEARCH_ACTION.description}
              onSelect={handleOpenCreateRequest}
            />

            {canExploreOpportunities ? (
              <AgentMapStackedMenuItem
                icon={Radar}
                title={EXPLORE_OPPORTUNITIES_ACTION.title}
                description={EXPLORE_OPPORTUNITIES_ACTION.description}
                onSelect={handleOpenExploreOpportunities}
              />
            ) : null}

            <DropdownMenu.Arrow className="fill-white" />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmCreateSavedSearchModal
        isOpen={isSaveSearchOpen}
        snapshot={savedSearchSnapshot}
        filters={submittedFilters}
        onClose={closeSaveSearch}
      />

      <ExploreOpportunitiesPanelModal
        isOpen={isExploreOpportunitiesOpen}
        session={exploreSession}
        onClose={closeExploreOpportunities}
      />
    </>
  )
})
