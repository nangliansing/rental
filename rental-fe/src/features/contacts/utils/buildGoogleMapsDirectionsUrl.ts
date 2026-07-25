export type DirectionsDestination = {
  coordinates?: readonly unknown[] | null
  name?: string | null
}

function parseCoordinate(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  if (typeof value !== "string" || !value.trim()) return null

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export function buildGoogleMapsDirectionsUrl(
  destination: DirectionsDestination | null | undefined,
) {
  const coordinates = destination?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null

  const longitude = parseCoordinate(coordinates[0])
  const latitude = parseCoordinate(coordinates[1])

  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null
  }

  const query = new URLSearchParams({
    api: "1",
    destination: `${latitude},${longitude}`,
  })

  return `https://www.google.com/maps/dir/?${query.toString()}`
}
