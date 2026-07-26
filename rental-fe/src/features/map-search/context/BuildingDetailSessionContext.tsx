import { createContext, useContext, type ReactNode } from "react"

import {
  BuildingNeighbourhoodExploreModal,
  useNeighbourhoodExploreDialog,
} from "@/features/buildings/neighbourhood-explore"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"

import { useMapSearchResults } from "./MapSearchSessionContext"

type BuildingDetailSessionContextValue = ReturnType<
  typeof useNeighbourhoodExploreDialog
>

const BuildingDetailSessionContext =
  createContext<BuildingDetailSessionContextValue | null>(null)

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
  const exploreNeighbourhood = useNeighbourhoodExploreDialog()

  return (
    <BuildingDetailSessionContext.Provider value={exploreNeighbourhood}>
      {children}

      <ListingDetailModal
        listingId={pendingListingId}
        onClose={onListingClose}
        onListingSelect={onListingSelect}
        trackBrowserHistory={false}
      />

      {selectedBuilding && (
        <BuildingNeighbourhoodExploreModal
          buildingId={selectedBuilding._id}
          isOpen={exploreNeighbourhood.isOpen}
          onClose={exploreNeighbourhood.close}
          trackBrowserHistory={false}
        />
      )}
    </BuildingDetailSessionContext.Provider>
  )
}

export function useBuildingDetailSession() {
  const context = useContext(BuildingDetailSessionContext)

  if (!context) {
    throw new Error(
      "useBuildingDetailSession must be used within BuildingDetailSessionProvider",
    )
  }

  return context
}
