import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"

import { NeighbourhoodExploreProvider } from "../NeighbourhoodExploreProvider"
import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import { NEIGHBOURHOOD_EXPLORE_MODAL_LABEL } from "../utils/neighbourhoodExploreUi"
import { NeighbourhoodExploreAttribution } from "./NeighbourhoodExploreAttribution"
import { NeighbourhoodExploreBody } from "./NeighbourhoodExploreBody"
import { NeighbourhoodExploreHeader } from "./NeighbourhoodExploreHeader"

type BuildingNeighbourhoodExploreModalProps = {
  buildingId: string | null
  isOpen: boolean
  onClose: () => void
  trackBrowserHistory?: boolean
}

function NeighbourhoodExploreModalShell({
  onClose,
}: {
  onClose: () => void
}) {
  const { neighbourhood, showMap } = useNeighbourhoodExplore()

  return (
    <>
      <NeighbourhoodExploreHeader onClose={onClose} />
      <NeighbourhoodExploreBody />
      {neighbourhood && !showMap && (
        <NeighbourhoodExploreAttribution variant="footer" />
      )}
    </>
  )
}

export function BuildingNeighbourhoodExploreModal({
  buildingId,
  isOpen,
  onClose,
  trackBrowserHistory = false,
}: BuildingNeighbourhoodExploreModalProps) {
  if (!isOpen || !buildingId?.trim()) return null

  const normalizedBuildingId = buildingId.trim()

  return (
    <ResponsiveScreenModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={NEIGHBOURHOOD_EXPLORE_MODAL_LABEL}
      trackBrowserHistory={trackBrowserHistory}
      size="wide"
    >
      {({ requestClose }) => (
        <NeighbourhoodExploreProvider
          buildingId={normalizedBuildingId}
          enabled={isOpen}
        >
          <NeighbourhoodExploreModalShell onClose={requestClose} />
        </NeighbourhoodExploreProvider>
      )}
    </ResponsiveScreenModal>
  )
}
