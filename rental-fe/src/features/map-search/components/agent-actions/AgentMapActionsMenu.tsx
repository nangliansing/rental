import { memo, useState } from "react"
import { DropdownMenu } from "radix-ui"
import { ListPlus, Plus, SendHorizontal } from "lucide-react"

import { toast } from "@/hooks/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getModalRoot } from "@/shared/utils/getModalRoot"

import { useMapInteraction } from "../../context/MapInteractionContext"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { useMapSearchCanvas, useMapSearchControls } from "../../context/MapSearchSessionContext"
import { useMapBounds } from "../../hooks/useMapBounds"
import {
  buildMapClientRequestGeoSnapshot,
  type MapClientRequestGeoSnapshot,
} from "../../utils/client-request-geo-from-map"
import { MAP_CONTROL_BUTTON_CLASS_NAME } from "../map-control-styles"
import { ConfirmCreateClientRequestModal } from "./ConfirmCreateClientRequestModal"

export const AgentMapActionsMenu = memo(function AgentMapActionsMenu() {
  const {
    canCreateListing,
    isListingSearch,
    nearbyRadiusMeters,
    linePoints,
    lineDistanceMeters,
    onEnterListingSearch,
    onExitListingSearch,
  } = useMapSearchControls()
  const { mode, selectedPin } = useMapInteraction()
  const { searchedPlace } = useMapSearchCanvas()
  const { getCurrentBounds } = useMapBounds()
  const { submittedFilters } = useMapSearchFilters()

  const [menuOpen, setMenuOpen] = useState(false)
  const [requestSnapshot, setRequestSnapshot] =
    useState<MapClientRequestGeoSnapshot | null>(null)

  if (!canCreateListing) return null

  const handleToggleListingMode = () => {
    if (isListingSearch) {
      onExitListingSearch()
    } else {
      onEnterListingSearch()
    }
    setMenuOpen(false)
  }

  const handleOpenCreateRequest = () => {
    const snapshot = buildMapClientRequestGeoSnapshot({
      mode,
      selectedPin,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      visibleBounds: getCurrentBounds(),
      placeName: searchedPlace?.name ?? null,
    })

    setMenuOpen(false)

    if (!snapshot) {
      toast({
        title: "Map area not ready",
        description: "Wait for the map to load, then try again.",
      })
      return
    }

    setRequestSnapshot(snapshot)
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
                aria-label="Agent map actions"
                data-testid="agent-map-actions"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
          </TooltipTrigger>
          <TooltipContent side="left">Agent actions</TooltipContent>
        </Tooltip>

        <DropdownMenu.Portal container={getModalRoot()}>
          <DropdownMenu.Content
            side="left"
            align="start"
            sideOffset={10}
            className="z-[70] min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-950 shadow-xl outline-none"
            aria-label="Agent map actions"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none data-[highlighted]:bg-slate-100"
              onSelect={(event) => {
                event.preventDefault()
                handleToggleListingMode()
              }}
            >
              <ListPlus
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {isListingSearch
                    ? "Exit listing mode"
                    : "Enter listing mode"}
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                  {isListingSearch
                    ? "Return to normal map search."
                    : "Find buildings to list a room."}
                </span>
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none data-[highlighted]:bg-slate-100"
              onSelect={(event) => {
                event.preventDefault()
                handleOpenCreateRequest()
              }}
            >
              <SendHorizontal
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Make a client request
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                  Use the current pin, line, or visible area.
                </span>
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Arrow className="fill-white" />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmCreateClientRequestModal
        isOpen={requestSnapshot !== null}
        snapshot={requestSnapshot}
        filters={submittedFilters}
        onClose={() => setRequestSnapshot(null)}
      />
    </>
  )
})
