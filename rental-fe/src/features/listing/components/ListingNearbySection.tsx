import { useMemo, useState } from "react"
import { MapPinned } from "lucide-react"

import { useBuildingNeighbourhood } from "@/features/buildings/api/useBuildingNeighbourhood"
import {
  useNeighbourhoodExploreDialogContext,
} from "@/features/buildings/neighbourhood-explore"
import { pickNearestNeighbourhoodPlaces } from "@/features/buildings/neighbourhood-explore/utils/pickNearestNeighbourhoodPlaces"
import { getNeighbourhoodPlacePinDisplay } from "@/features/buildings/neighbourhood-explore/utils/neighbourhoodPlacePinDisplay"
import { formatDistance } from "@/features/map-search/utils/building-display"
import { cn } from "@/lib/utils"

import { ListingPostCollapsibleSection } from "./ListingPostCollapsibleSection"

export const LISTING_NEARBY_SECTION_TITLE = "What's nearby?"

type ListingNearbySectionProps = {
  buildingId?: unknown
  className?: string
  defaultOpen?: boolean
}

function normalizeBuildingId(buildingId: unknown) {
  return typeof buildingId === "string" ? buildingId.trim() : ""
}

/**
 * Collapsed-by-default “What's nearby?” peek.
 * Fetches neighbourhood data only while expanded; shares React Query cache with explore modal.
 */
export function ListingNearbySection({
  buildingId,
  className,
  defaultOpen = false,
}: ListingNearbySectionProps) {
  const normalizedBuildingId = normalizeBuildingId(buildingId)
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const exploreNeighbourhood = useNeighbourhoodExploreDialogContext()

  const neighbourhoodQuery = useBuildingNeighbourhood({
    buildingId: normalizedBuildingId,
    enabled: isOpen && Boolean(normalizedBuildingId),
  })

  const nearestPlaces = useMemo(
    () => pickNearestNeighbourhoodPlaces(neighbourhoodQuery.data?.places),
    [neighbourhoodQuery.data?.places],
  )

  if (!normalizedBuildingId) return null

  const canExplore = Boolean(exploreNeighbourhood?.open)
  const showExploreCta = canExplore

  return (
    <ListingPostCollapsibleSection
      title={LISTING_NEARBY_SECTION_TITLE}
      ariaLabel="Nearby places"
      open={isOpen}
      onOpenChange={setIsOpen}
      className={className}
    >
      <div className="mt-2 space-y-3">
        <NearbySectionBody
          isPending={neighbourhoodQuery.isPending}
          isError={neighbourhoodQuery.isError}
          isFetching={neighbourhoodQuery.isFetching}
          nearestPlaces={nearestPlaces}
          onRetry={() => void neighbourhoodQuery.refetch()}
        />

        {showExploreCta ? (
          <button
            type="button"
            className={cn(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl",
              "border border-slate-200 bg-white text-sm font-semibold text-slate-900",
              "hover:bg-slate-50 active:bg-slate-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20",
            )}
            onClick={() => exploreNeighbourhood?.open()}
          >
            <MapPinned className="h-4 w-4 text-slate-600" aria-hidden="true" />
            Explore more on the map
          </button>
        ) : null}
      </div>
    </ListingPostCollapsibleSection>
  )
}

function NearbySectionBody({
  isPending,
  isError,
  isFetching,
  nearestPlaces,
  onRetry,
}: {
  isPending: boolean
  isError: boolean
  isFetching: boolean
  nearestPlaces: ReturnType<typeof pickNearestNeighbourhoodPlaces>
  onRetry: () => void
}) {
  if (isPending && nearestPlaces.length === 0) {
    return <NearbyPlacesSkeleton />
  }

  if (isError && nearestPlaces.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-sm font-medium text-slate-800">
          Couldn&apos;t load nearby places
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-slate-950 underline-offset-2 hover:underline"
          onClick={onRetry}
          disabled={isFetching}
        >
          Try again
        </button>
      </div>
    )
  }

  if (nearestPlaces.length === 0) {
    return (
      <p className="text-sm leading-5 text-slate-500">
        No nearby places found within walking distance.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {nearestPlaces.map(({ groupId, groupLabel, place }) => {
        const { Icon } = getNeighbourhoodPlacePinDisplay(
          place.category,
          place.mode,
        )
        const distance = formatDistance(place.distanceMeters)

        return (
          <li
            key={groupId}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-950">
                {place.name.trim()}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {groupLabel}
                {distance ? ` · ${distance}` : null}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function NearbyPlacesSkeleton() {
  return (
    <ul
      className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-2.5">
          <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  )
}
