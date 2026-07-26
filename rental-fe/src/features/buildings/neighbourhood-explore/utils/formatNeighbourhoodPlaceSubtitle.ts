import { formatDistance } from "@/features/map-search/utils/building-display"

import type { NeighbourhoodPlace } from "../../api/getBuildingNeighbourhood"

export function formatNeighbourhoodPlaceSubtitle(place: NeighbourhoodPlace) {
  const distance = formatDistance(place.distanceMeters)

  if (place.line) {
    return `${distance} · ${place.line}`
  }

  if (place.mode) {
    return `${distance} · ${place.mode.toUpperCase()}`
  }

  return distance
}
