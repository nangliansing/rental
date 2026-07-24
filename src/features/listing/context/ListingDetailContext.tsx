import { createContext, useContext, type ReactNode } from "react"

import type {
  SearchListing,
  SearchListingsBuilding,
} from "@/features/map-search/types"

export type ListingDetailListing = SearchListing & {
  building?: SearchListingsBuilding | null
}

type ListingDetailContextValue = {
  listing: ListingDetailListing
  currentUserId?: string
  canCreateListing: boolean
  onDeleted?: () => void
  onListingSelect?: (listingId: string) => void
}

const ListingDetailContext = createContext<ListingDetailContextValue | null>(
  null,
)

export function ListingDetailProvider({
  value,
  children,
}: {
  value: ListingDetailContextValue
  children: ReactNode
}) {
  return (
    <ListingDetailContext.Provider value={value}>
      {children}
    </ListingDetailContext.Provider>
  )
}

export function useListingDetail() {
  const context = useContext(ListingDetailContext)

  if (!context) {
    throw new Error("useListingDetail must be used within ListingDetailProvider")
  }

  return context
}
