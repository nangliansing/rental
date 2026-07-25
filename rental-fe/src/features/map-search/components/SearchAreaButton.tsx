import type React from "react"
import { memo } from "react"
import {
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Radius,
  Route,
  Search,
  Undo2,
  X,
} from "lucide-react"
import { useMap } from "@vis.gl/react-google-maps"
import { Popover } from "radix-ui"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useMapInteraction } from "../context/MapInteractionContext"
import { useMapSearchControls } from "../context/MapSearchSessionContext"
import { useMapBounds } from "../hooks/useMapBounds"
import { useCurrentLocation } from "../hooks/useCurrentLocation"
import { useMapCameraTransition } from "../hooks/useMapCameraTransition"
import {
  formatSearchRadius,
  NEARBY_RADIUS_OPTIONS,
} from "../utils/search-radius"

const toolButtonClassName =
  "flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
const LINE_REQUIREMENTS_ID = "line-search-requirements"

export const SearchAreaButton = memo(function SearchAreaButton() {
  const {
    isSearchingArea,
    isSearchingNearby,
    isSearchingLine,
    isSearchActionVisible,
    searchStatus,
    nearbyRadiusMeters,
    linePoints,
    lineDistanceMeters,
    onSearchArea,
    onDropPin,
    onCurrentLocationFound,
    onSearchNearby,
    onClearPin,
    onNearbyRadiusChange,
    onToggleLineMode,
    onUndoLinePoint,
    onLineDistanceChange,
    onSearchLine,
  } = useMapSearchControls()
  const { mode, selectedPin } = useMapInteraction()
  const map = useMap()
  const { getCurrentBounds } = useMapBounds()
  const currentLocation = useCurrentLocation()
  const cameraTransition = useMapCameraTransition(map)
  const isPinMode = mode === "pin"
  const isLineMode = mode === "line"
  const isSearching = isLineMode
    ? isSearchingLine
    : isPinMode
      ? isSearchingNearby
      : isSearchingArea
  const activeDistanceMeters = isLineMode
    ? lineDistanceMeters
    : nearbyRadiusMeters
  const radiusLabel = formatSearchRadius(activeDistanceMeters)
  const lineNeedsMorePoints = isLineMode && linePoints.length < 2
  const modeAnnouncement = isLineMode
    ? `Draw search line mode. ${linePoints.length} points placed. Search distance ${radiusLabel}.`
    : isPinMode
      ? `Pin search mode. Search radius ${radiusLabel}.`
      : "Area search mode."
  const descriptiveSearchLabel = isLineMode
    ? linePoints.length === 0
      ? "Place starting point"
      : linePoints.length === 1
        ? "Place another point"
        : searchStatus === "stale"
          ? "Search updated line"
          : `Search within ${radiusLabel} of line`
    : isPinMode
      ? `Search within ${radiusLabel}`
      : "Search this area"

  const handlePrimarySearch = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur()
    if (isSearching) return

    if (isLineMode) {
      onSearchLine()
      return
    } else if (isPinMode) {
      if (selectedPin) onSearchNearby()
      return
    }

    const bounds = getCurrentBounds()
    if (bounds) onSearchArea(bounds)
  }

  const handleManualPinToggle = () => {
    if (isPinMode) {
      onClearPin()
      return
    }

    const center = map?.getCenter()
    if (!center) return
    onDropPin({ lat: center.lat(), lng: center.lng() })
  }

  const handleUseCurrentLocation = () => {
    currentLocation.requestLocation((position) => {
      onCurrentLocationFound(position)
      cameraTransition.flyTo(position, Math.max(map?.getZoom() ?? 0, 16))
    })
  }

  const isLocating =
    currentLocation.status === "locating" || cameraTransition.isMoving

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {modeAnnouncement}
      </div>
      {lineNeedsMorePoints && (
        <p id={LINE_REQUIREMENTS_ID} className="sr-only">
          {linePoints.length === 0
            ? "Place a starting point on the map before searching."
            : "Place at least one more point on the map to create a searchable line."}
        </p>
      )}

      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-[4.25rem] z-20 flex justify-center px-4 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none md:top-20",
          isSearchActionVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-1 opacity-0",
        )}
        aria-hidden={!isSearchActionVisible}
      >
        <button
          type="button"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 shadow-lg hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 md:h-11 md:gap-2 md:px-5 md:text-sm"
          onClick={handlePrimarySearch}
          aria-label={isSearching ? "Searching" : descriptiveSearchLabel}
          aria-describedby={lineNeedsMorePoints ? LINE_REQUIREMENTS_ID : undefined}
          disabled={
            isSearching ||
            !isSearchActionVisible ||
            lineNeedsMorePoints
          }
        >
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin md:h-4 md:w-4" aria-hidden="true" />
          ) : isLineMode ? (
            <Route className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
          ) : isPinMode ? (
            <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
          ) : (
            <Search className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
          )}
          {isSearching ? (
            "Searching..."
          ) : descriptiveSearchLabel}
        </button>
      </div>

      <TooltipProvider>
        <div
          className={cn(
            "absolute right-4 top-28 z-20 flex flex-col gap-2 transition-[right] duration-200 sm:right-6",
            searchStatus !== "idle" && "lg:right-[448px]",
          )}
          data-testid="map-mode-controls"
        >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
          type="button"
          className={cn(
            toolButtonClassName,
            "border-slate-200 text-blue-600",
          )}
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          aria-label={
            isLocating
              ? currentLocation.status === "locating"
                ? "Locating..."
                : "Moving to your location..."
              : "Use my location"
          }
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
              <LocateFixed className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Use my location</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
          type="button"
          className={cn(
            toolButtonClassName,
            isPinMode
              ? "border-slate-950 bg-slate-950 text-white ring-2 ring-slate-950 ring-offset-2 hover:bg-slate-800"
              : "border-slate-200 text-slate-700",
          )}
          onClick={handleManualPinToggle}
          aria-label={isPinMode ? "Remove pin" : "Drop pin"}
          aria-pressed={isPinMode}
        >
          <MapPin className="h-5 w-5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isPinMode ? "Remove pin" : "Drop a pin"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                toolButtonClassName,
                isLineMode
                  ? "border-violet-700 bg-violet-700 text-white ring-2 ring-violet-700 ring-offset-2 hover:bg-violet-600"
                  : "border-slate-200 text-slate-700",
              )}
              onClick={onToggleLineMode}
              aria-label={
                isLineMode ? "Exit line search mode" : "Draw search line"
              }
              aria-pressed={isLineMode}
            >
              <Route className="h-5 w-5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isLineMode ? "Return to area search" : "Draw search line"}
          </TooltipContent>
        </Tooltip>

        {(isPinMode || isLineMode) && (
          <Tooltip>
            <Popover.Root>
              <TooltipTrigger asChild>
                <Popover.Trigger asChild>
                  <button
                type="button"
                className={cn(
                  toolButtonClassName,
                  "border-slate-200 text-slate-700",
                )}
                aria-label={`${isLineMode ? "Line search distance" : "Search radius"}: ${radiusLabel}`}
              >
                <Radius className="h-5 w-5" aria-hidden="true" />
                  </button>
                </Popover.Trigger>
              </TooltipTrigger>
              <TooltipContent side="left">
                Adjust search radius ({radiusLabel})
              </TooltipContent>
            <Popover.Portal>
              <Popover.Content
                side="left"
                align="start"
                sideOffset={10}
                className="z-[70] w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-950 shadow-xl outline-none"
                aria-label="Select search radius"
              >
                <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                  {isLineMode ? "Distance from line" : "Search radius"}
                </p>
                {NEARBY_RADIUS_OPTIONS.map((radius) => {
                  const isSelected = radius === activeDistanceMeters

                  return (
                    <Popover.Close asChild key={radius}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                          isSelected && "bg-blue-50 font-semibold text-blue-700",
                        )}
                        onClick={() =>
                          isLineMode
                            ? onLineDistanceChange(radius)
                            : onNearbyRadiusChange(radius)
                        }
                        aria-pressed={isSelected}
                      >
                        {formatSearchRadius(radius)}
                        {isSelected && (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </Popover.Close>
                  )
                })}
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
            </Popover.Root>
          </Tooltip>
        )}

        {isLineMode && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(toolButtonClassName, "border-slate-200 text-slate-700")}
                  onClick={onUndoLinePoint}
                  disabled={linePoints.length === 0}
                  aria-label="Undo last line point"
                >
                  <Undo2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">Undo last point</TooltipContent>
            </Tooltip>
          </>
        )}

        {currentLocation.error && (
          <div
            className="absolute right-0 top-full mt-2 flex w-72 items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-rose-700 shadow-lg ring-1 ring-rose-100"
            role="alert"
          >
            <span className="flex-1">{currentLocation.error}</span>
            <button
              type="button"
              className="shrink-0 text-slate-500 hover:text-slate-950"
              onClick={currentLocation.clearError}
              aria-label="Dismiss location error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        </div>
      </TooltipProvider>
    </>
  )
})
