import type {
  SearchListing,
  SearchListingsBuilding,
} from "@/features/map-search/types"

export type ListingVisibility = "PUBLIC" | "PRIVATE"

export type ListingDetailListing = SearchListing & {
  building?: SearchListingsBuilding | null
}
