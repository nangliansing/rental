import { NEIGHBOURHOOD_RADIUS_OPTIONS } from "../../constants/neighbourhood"

export function getNeighbourhoodRadiusLabel(radiusMeters: number) {
  return (
    NEIGHBOURHOOD_RADIUS_OPTIONS.find((option) => option.value === radiusMeters)
      ?.label ?? `${radiusMeters.toLocaleString()} m`
  )
}
