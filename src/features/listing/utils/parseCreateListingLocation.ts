import type { BuildingLocation } from "@/features/map-search/types"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"

export function parseCreateListingLocation(
  lat: string | null,
  lng: string | null,
): BuildingLocation | null {
  if (!lat?.trim() || !lng?.trim()) return null

  const position = {
    lat: Number(lat),
    lng: Number(lng),
  }

  if (!isValidMapPosition(position)) return null

  return {
    type: "Point",
    coordinates: [position.lng, position.lat],
  }
}
