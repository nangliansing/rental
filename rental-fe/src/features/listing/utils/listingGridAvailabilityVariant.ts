/** Grid card + map preview surfaces only use indicator or compact. */
export type ListingGridAvailabilityVariant = "indicator" | "compact"

export type ListingAvailabilityFilterTab = "all" | "now" | "soon" | "private"

export const LISTING_GRID_AVAILABILITY_VARIANT = {
  /** Dense grids where users scan for "available now". */
  browse: "indicator",
  /** Contexts where move-in timing is the primary task. */
  timing: "compact",
} as const satisfies Record<string, ListingGridAvailabilityVariant>

export function getListingGridAvailabilityVariant(
  filter: ListingAvailabilityFilterTab,
): ListingGridAvailabilityVariant {
  return filter === "soon"
    ? LISTING_GRID_AVAILABILITY_VARIANT.timing
    : LISTING_GRID_AVAILABILITY_VARIANT.browse
}
