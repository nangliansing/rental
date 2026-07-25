import type { DirectionsDestination } from "@/features/contacts/utils/buildGoogleMapsDirectionsUrl"
import { normalizeDirectionsDestination } from "@/features/contacts/utils/directionsDisplay"
import { normalizeContactText } from "@/features/contacts/utils/contactNormalization"

type BuildingDirectionsSource = {
  name?: string | null
  location?: {
    coordinates?: readonly unknown[] | null
  } | null
} | null | undefined

export function buildListingDirectionsDestination(
  building: BuildingDirectionsSource,
): DirectionsDestination | null {
  const coordinates = building?.location?.coordinates
  if (!Array.isArray(coordinates)) return null

  return normalizeDirectionsDestination({
    name: normalizeContactText(building?.name),
    coordinates,
  })
}
