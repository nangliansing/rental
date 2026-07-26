import { MapPin, SearchX } from "lucide-react"
import { useMemo, useState } from "react"

import { formatDistance } from "@/features/map-search/utils/building-display"
import { CollectionRefreshErrorBanner } from "@/features/map-search/components/results/CollectionRefreshErrorBanner"
import { cn } from "@/lib/utils"
import {
  CollectionRefreshStatus,
  ListingCollectionMessage,
} from "@/shared/components/collections/ListingCollectionState"
import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import { useBuildingNeighbourhood } from "../api/useBuildingNeighbourhood"
import {
  NEIGHBOURHOOD_ALL_CATEGORY_KEY,
  NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  NEIGHBOURHOOD_RADIUS_OPTIONS,
  type NeighbourhoodRadiusMeters,
} from "../constants/neighbourhood"
import {
  filterNeighbourhoodPlaces,
  type NeighbourhoodCategoryFilter,
} from "../utils/filterNeighbourhoodPlaces"

type BuildingNeighbourhoodSectionProps = {
  buildingId: string
  className?: string
}

function NeighbourhoodPlaceListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  )
}

function NeighbourhoodPlaceRow({
  name,
  distanceMeters,
  subtitle,
}: {
  name: string
  distanceMeters: number
  subtitle?: string | null
}) {
  const distanceLabel = formatDistance(distanceMeters)

  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-950">{name}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {distanceLabel && (
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {distanceLabel}
        </span>
      )}
    </li>
  )
}

export function BuildingNeighbourhoodSection({
  buildingId,
  className,
}: BuildingNeighbourhoodSectionProps) {
  const [radiusMeters, setRadiusMeters] = useState<NeighbourhoodRadiusMeters>(
    NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  )
  const [selectedCategory, setSelectedCategory] =
    useState<NeighbourhoodCategoryFilter>(NEIGHBOURHOOD_ALL_CATEGORY_KEY)

  const neighbourhoodQuery = useBuildingNeighbourhood({
    buildingId,
    radiusM: radiusMeters,
    fetchRadiusM: NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  })

  const neighbourhood = neighbourhoodQuery.data
  const hasPlaces = (neighbourhood?.places.length ?? 0) > 0
  const isInitialLoading = neighbourhoodQuery.isPending && !neighbourhood
  const isInitialError = neighbourhoodQuery.isError && !neighbourhood
  const isBackgroundFetching =
    neighbourhoodQuery.isFetching && hasPlaces && !isInitialLoading

  const categoryTabs = useMemo(() => {
    if (!neighbourhood) return []

    const allCount = neighbourhood.summary.all

    return [
      {
        id: NEIGHBOURHOOD_ALL_CATEGORY_KEY,
        label: `All (${allCount})`,
      },
      ...neighbourhood.categories.map((category) => ({
        id: category.key,
        label: `${category.label} (${category.count})`,
      })),
    ]
  }, [neighbourhood])

  const visiblePlaces = useMemo(() => {
    if (!neighbourhood) return []

    return filterNeighbourhoodPlaces(neighbourhood.places, selectedCategory)
  }, [neighbourhood, selectedCategory])

  const handleRadiusChange = (value: string) => {
    const nextRadius = Number(value)

    if (
      NEIGHBOURHOOD_RADIUS_OPTIONS.some((option) => option.value === nextRadius)
    ) {
      setRadiusMeters(nextRadius as NeighbourhoodRadiusMeters)
    }
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value as NeighbourhoodCategoryFilter)
  }

  return (
    <section
      className={cn("border-b border-slate-100 pb-4", className)}
      aria-label="Explore neighbourhood"
    >
      <div className="px-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">
            Explore neighbourhood
          </h2>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Straight-line distances from this building.
        </p>

        <div className="mt-3 space-y-3">
          <SegmentedTabs
            aria-label="Neighbourhood radius"
            options={NEIGHBOURHOOD_RADIUS_OPTIONS.map((option) => ({
              id: String(option.value),
              label: option.label,
            }))}
            value={String(radiusMeters)}
            onChange={handleRadiusChange}
          />

          {categoryTabs.length > 0 && (
            <SegmentedTabs
              aria-label="Neighbourhood categories"
              options={categoryTabs}
              value={selectedCategory}
              onChange={handleCategoryChange}
            />
          )}
        </div>
      </div>

      {isBackgroundFetching && (
        <CollectionRefreshStatus
          label="Updating nearby places..."
          className="mt-3 px-4"
        />
      )}

      {neighbourhoodQuery.isError && hasPlaces && (
        <CollectionRefreshErrorBanner
          className="mx-4 mt-3"
          label="Could not update nearby places. Showing the previous results."
          onRetry={() => void neighbourhoodQuery.refetch()}
        />
      )}

      {isInitialLoading && <NeighbourhoodPlaceListSkeleton />}

      {isInitialError && (
        <ListingCollectionMessage
          className="min-h-40"
          title="Could not load nearby places"
          description="Please try again in a moment."
          onRetry={() => void neighbourhoodQuery.refetch()}
        />
      )}

      {!isInitialLoading &&
        !isInitialError &&
        neighbourhood &&
        visiblePlaces.length === 0 && (
          <ListingCollectionMessage
            className="min-h-40"
            icon={SearchX}
            title="No nearby places found"
            description={`Try expanding the radius beyond ${radiusMeters.toLocaleString()} m.`}
          />
        )}

      {visiblePlaces.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {visiblePlaces.map((place) => (
            <NeighbourhoodPlaceRow
              key={place.id}
              name={place.name}
              distanceMeters={place.distanceMeters}
              subtitle={
                place.line
                  ? place.line
                  : place.mode
                    ? place.mode.toUpperCase()
                    : null
              }
            />
          ))}
        </ul>
      )}

      {neighbourhood && (
        <p className="mt-3 px-4 text-[11px] text-slate-400">
          Places data © OpenStreetMap contributors
        </p>
      )}
    </section>
  )
}
