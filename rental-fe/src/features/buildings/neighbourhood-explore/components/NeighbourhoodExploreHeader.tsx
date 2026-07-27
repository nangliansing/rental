import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"

import { useNeighbourhoodExploreData } from "../NeighbourhoodExploreContext"
import {
  NEIGHBOURHOOD_EXPLORE_CLOSE_LABEL,
  NEIGHBOURHOOD_EXPLORE_MODAL_DESCRIPTION,
  NEIGHBOURHOOD_EXPLORE_MODAL_LABEL,
} from "../utils/neighbourhoodExploreUi"
import { NeighbourhoodRadiusSelect } from "./NeighbourhoodRadiusSelect"

type NeighbourhoodExploreHeaderProps = {
  onClose: () => void
}

export function NeighbourhoodExploreHeader({
  onClose,
}: NeighbourhoodExploreHeaderProps) {
  const { radiusMeters, setRadius } = useNeighbourhoodExploreData()

  return (
    <ModalDismissHeader
      onClose={onClose}
      closeLabel={NEIGHBOURHOOD_EXPLORE_CLOSE_LABEL}
      title={NEIGHBOURHOOD_EXPLORE_MODAL_LABEL}
      description={NEIGHBOURHOOD_EXPLORE_MODAL_DESCRIPTION}
      trailing={
        <NeighbourhoodRadiusSelect value={radiusMeters} onChange={setRadius} />
      }
    />
  )
}
