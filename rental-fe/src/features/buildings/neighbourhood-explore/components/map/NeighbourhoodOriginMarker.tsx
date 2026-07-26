import { NEIGHBOURHOOD_PIN_SIZES } from "../../constants/neighbourhoodPinSizes"
import { BUILDING_PIN_DISPLAY } from "../../utils/neighbourhoodPlacePinDisplay"
import { BallStickMapPin } from "./BallStickMapPin"

export function NeighbourhoodOriginMarker() {
  const { color, Icon } = BUILDING_PIN_DISPLAY
  const { ballSize, iconSize } = NEIGHBOURHOOD_PIN_SIZES.building

  return (
    <BallStickMapPin color={color} ballSize={ballSize} variant="filled">
      <Icon
        aria-hidden="true"
        className="text-white"
        size={iconSize}
        strokeWidth={2.5}
      />
    </BallStickMapPin>
  )
}
