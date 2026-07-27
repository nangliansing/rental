import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import { NEIGHBOURHOOD_PIN_SIZES } from "../../constants/neighbourhoodPinSizes"
import { getNeighbourhoodPlacePinDisplay } from "../../utils/neighbourhoodPlacePinDisplay"
import { BallStickMapPin } from "./BallStickMapPin"

type NeighbourhoodPlaceMarkerProps = {
  place: NeighbourhoodPlace
  isSelected: boolean
}

export function NeighbourhoodPlaceMarker({
  place,
  isSelected,
}: NeighbourhoodPlaceMarkerProps) {
  const { color, Icon } = getNeighbourhoodPlacePinDisplay(
    place.category,
    place.mode,
  )
  const sizes = isSelected
    ? NEIGHBOURHOOD_PIN_SIZES.selectedPlace
    : NEIGHBOURHOOD_PIN_SIZES.place

  return (
    <BallStickMapPin
      color={color}
      ballSize={sizes.ballSize}
      variant="light"
      isSelected={isSelected}
    >
      <Icon
        aria-hidden="true"
        style={{ color: isSelected ? "#ffffff" : color }}
        size={sizes.iconSize}
        strokeWidth={isSelected ? 2.75 : 2.5}
      />
    </BallStickMapPin>
  )
}
