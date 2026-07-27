import { type ReactNode } from "react"

import {
  NeighbourhoodExploreDialogProvider,
  useNeighbourhoodExploreDialogContext,
} from "@/features/buildings/neighbourhood-explore"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"

import { useMapSearchResults } from "./MapSearchSessionContext"

export function BuildingDetailSessionProvider({
  children,
}: {
  children: ReactNode
}) {
  const {
    selectedBuilding,
    pendingListingId,
    onListingSelect,
    onListingClose,
  } = useMapSearchResults()

  return (
    <NeighbourhoodExploreDialogProvider
      buildingId={selectedBuilding?._id}
      trackBrowserHistory={false}
    >
      {children}

      <ListingDetailModal
        listingId={pendingListingId}
        onClose={onListingClose}
        onListingSelect={onListingSelect}
        trackBrowserHistory={false}
      />
    </NeighbourhoodExploreDialogProvider>
  )
}

export function useBuildingDetailSession() {
  const context = useNeighbourhoodExploreDialogContext()

  if (!context) {
    throw new Error(
      "useBuildingDetailSession must be used within BuildingDetailSessionProvider",
    )
  }

  return context
}
