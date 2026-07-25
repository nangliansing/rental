import {
  buildGoogleMapsDirectionsUrl,
  type DirectionsDestination,
} from "./buildGoogleMapsDirectionsUrl"
import { normalizeContactText } from "./contactNormalization"

export function normalizeDirectionsDestination(
  destination: DirectionsDestination | null | undefined,
): DirectionsDestination | null {
  if (!destination) return null

  const url = buildGoogleMapsDirectionsUrl(destination)
  if (!url) return null

  const coordinates = destination.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null

  return {
    name: normalizeContactText(destination.name),
    coordinates: [coordinates[0], coordinates[1]],
  }
}

export function resolveDirectionsAction(
  destination: DirectionsDestination | null | undefined,
) {
  const normalizedDestination = normalizeDirectionsDestination(destination)
  const directionsUrl = buildGoogleMapsDirectionsUrl(normalizedDestination)
  const destinationLabel = normalizeContactText(normalizedDestination?.name)

  return {
    destinationLabel,
    directionsUrl,
    hasDirections: Boolean(directionsUrl),
    normalizedDestination,
  }
}

export function getDirectionsTriggerLabel(destinationLabel?: string | null) {
  return destinationLabel
    ? `Get directions to ${destinationLabel}`
    : "Get directions"
}

export function getDirectionsConfirmDescription(
  destinationLabel?: string | null,
) {
  if (destinationLabel) {
    return `Open Google Maps with directions to ${destinationLabel}?`
  }

  return "Open Google Maps with directions to this building?"
}
