import type { SearchListing } from "@/features/map-search/types"

export type ListingGridCardListing = SearchListing & {
  building?: {
    name?: string | null
  } | null
}
