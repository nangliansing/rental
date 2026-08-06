import { normalizeListingFacilities } from "../utils/listingFacilityDisplay"
import { ListingFacilityIconTile } from "./ListingFacilityIconTile"
import { ListingPostCollapsibleSection } from "./ListingPostCollapsibleSection"

export const LISTING_FACILITIES_SECTION_TITLE =
  "What's included in this space?"

type ListingFacilitiesSectionProps = {
  facilities?: unknown
  className?: string
  defaultOpen?: boolean
}

/**
 * Collapsed-by-default disclosure of listing facilities as a wrapping icon grid.
 */
export function ListingFacilitiesSection({
  facilities,
  className,
  defaultOpen = false,
}: ListingFacilitiesSectionProps) {
  const items = normalizeListingFacilities(facilities)

  if (items.length === 0) return null

  return (
    <ListingPostCollapsibleSection
      title={LISTING_FACILITIES_SECTION_TITLE}
      ariaLabel="Listing facilities"
      defaultOpen={defaultOpen}
      className={className}
    >
      <ul className="mt-2 grid list-none grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-2 gap-y-3 p-0">
        {items.map((facility) => (
          <li key={facility.toLowerCase()} className="flex justify-center">
            <ListingFacilityIconTile value={facility} />
          </li>
        ))}
      </ul>
    </ListingPostCollapsibleSection>
  )
}
