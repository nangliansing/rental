import { ReadOnlyMap, type ReadOnlyMapGeo } from "@/shared/google-maps/readonly-map"

import { ListingPostCollapsibleSection } from "./ListingPostCollapsibleSection"

export const LISTING_LOCATION_SECTION_TITLE = "Where will I be?"

type ListingLocationSectionProps = {
  geo: ReadOnlyMapGeo | null | undefined
  mapInstanceId?: string
  className?: string
  defaultOpen?: boolean
}

/**
 * Collapsed-by-default disclosure of the listing pin on a locked read-only map.
 * Mounts the map only while open so Maps stays unloaded until the user expands.
 */
export function ListingLocationSection({
  geo,
  mapInstanceId = "listing-location-map",
  className,
  defaultOpen = false,
}: ListingLocationSectionProps) {
  if (!geo) return null

  return (
    <ListingPostCollapsibleSection
      title={LISTING_LOCATION_SECTION_TITLE}
      ariaLabel="Listing location"
      defaultOpen={defaultOpen}
      className={className}
    >
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-48 w-full sm:h-56">
          <ReadOnlyMap
            geo={geo}
            navigable={false}
            className="h-full w-full"
            mapInstanceId={mapInstanceId}
            emptyMessage="Location is unavailable."
          />
        </div>
      </div>
    </ListingPostCollapsibleSection>
  )
}
