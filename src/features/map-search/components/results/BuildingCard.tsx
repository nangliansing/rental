import { memo } from "react"
import { cn } from "@/lib/utils"

import type { SearchBuilding } from "../../types"
import {
  formatBuildingRent,
  formatDistance,
} from "../../utils/building-display"
import { BuildingListingPreview } from "./BuildingListingPreview"

type BuildingCardProps = {
  building: SearchBuilding
  isSelected: boolean
  isListingSearch?: boolean
  canCreateListing?: boolean
  onSelect: (building: SearchBuilding) => void
  onHoverChange?: (buildingId: string | null) => void
  onListHere?: (building: SearchBuilding) => void
}

export const BuildingCard = memo(function BuildingCard({
  building,
  isSelected,
  isListingSearch = false,
  canCreateListing = false,
  onSelect,
  onHoverChange,
  onListHere,
}: BuildingCardProps) {
  const distanceLabel = formatDistance(building.distanceMeters)
  const hasMatchingListings = building.listings.length > 0
  const showListHereAction = canCreateListing && onListHere
  const shouldShowRentLabel =
    building.minRent !== null || !isListingSearch || hasMatchingListings

  return (
    <div
      className={cn(
        "w-full border-b border-slate-100 px-1 py-4 text-left last:border-b-0",
        isSelected ? "bg-slate-50" : "bg-white",
      )}
      onMouseEnter={() => onHoverChange?.(building._id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(building._id)}
      onBlur={() => onHoverChange?.(null)}
    >
      <div className="space-y-1.5">
        <button
          type="button"
          data-building-trigger={building._id}
          className="w-full text-left"
          onClick={() => onSelect(building)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight text-slate-950">
                {building.name}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {building.buildingType}
              </p>
            </div>

            {(shouldShowRentLabel || distanceLabel) && (
              <div className="shrink-0 text-right">
                {shouldShowRentLabel && (
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      building.minRent === null
                        ? "text-slate-400"
                        : "text-slate-950",
                    )}
                  >
                    {formatBuildingRent(building)}
                  </p>
                )}

                {distanceLabel && (
                  <p className="mt-1 text-xs text-slate-500">
                    {distanceLabel}
                  </p>
                )}
              </div>
            )}
          </div>
        </button>

        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelect(building)}
          >
            {building.address && (
              <p className="line-clamp-1 text-sm text-slate-500">
                {building.address}
              </p>
            )}
          </button>

          {showListHereAction && (!isListingSearch || hasMatchingListings) && (
            <button
              type="button"
              className={cn(
                "-mt-0.5 inline-flex h-7 shrink-0 items-center px-2.5 text-xs font-medium",
                isListingSearch
                  ? "rounded-md bg-slate-950 text-white hover:bg-slate-800"
                  : "rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950",
              )}
              onClick={() => onListHere(building)}
            >
              {isListingSearch ? "List here" : "+ List"}
            </button>
          )}
        </div>
      </div>

      {hasMatchingListings ? (
        <div className="-mx-5 mt-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {building.listings.slice(0, 4).map((listing) => (
              <button
                key={listing._id}
                type="button"
                className="text-left"
                onClick={() => onSelect(building)}
              >
                <BuildingListingPreview listing={listing} />
              </button>
            ))}
          </div>
        </div>
      ) : isListingSearch ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              No matching rooms
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              You can still list a room under this building.
            </p>
          </div>

          {showListHereAction && (
            <button
              type="button"
              className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
              onClick={() => onListHere(building)}
            >
              List here
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
})
