import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import { NEIGHBOURHOOD_PIN_SIZES } from "../../constants/neighbourhoodPinSizes"
import { getNeighbourhoodPlacePinDisplay } from "../../utils/neighbourhoodPlacePinDisplay"
import { BallStickMapPin } from "./BallStickMapPin"

type NeighbourhoodPlaceMarkerProps = {
  place: NeighbourhoodPlace
  isSelected: boolean
  onSelect?: () => void
}

export function NeighbourhoodPlaceMarker({
  place,
  isSelected,
  onSelect,
}: NeighbourhoodPlaceMarkerProps) {
  const { color, Icon } = getNeighbourhoodPlacePinDisplay(place.category)
  const sizes = isSelected
    ? NEIGHBOURHOOD_PIN_SIZES.selectedPlace
    : NEIGHBOURHOOD_PIN_SIZES.place

  return (
    <BallStickMapPin
      color={color}
      ballSize={sizes.ballSize}
      variant="light"
      isSelected={isSelected}
      label={place.name}
      onClick={onSelect}
    >
      <Icon
        aria-hidden="true"
        style={{ color }}
        size={sizes.iconSize}
        strokeWidth={2.5}
      />
    </BallStickMapPin>
  )
}
