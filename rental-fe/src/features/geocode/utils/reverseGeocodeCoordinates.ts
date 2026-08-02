import { REVERSE_GEOCODE_COORDINATE_DECIMALS } from "../constants"

export type ReverseGeocodeCoordinates = {
  lat: number
  lng: number
}

export function roundReverseGeocodeCoordinate(
  value: number,
  decimalPlaces = REVERSE_GEOCODE_COORDINATE_DECIMALS,
) {
  const factor = 10 ** decimalPlaces
  return Math.round(value * factor) / factor
}

export function normalizeReverseGeocodeCoordinates(
  lat: number,
  lng: number,
): ReverseGeocodeCoordinates {
  return {
    lat: roundReverseGeocodeCoordinate(lat),
    lng: roundReverseGeocodeCoordinate(lng),
  }
}

export function isValidReverseGeocodeCoordinate(
  value: unknown,
): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function readReverseGeocodeCoordinates(
  lat: unknown,
  lng: unknown,
): ReverseGeocodeCoordinates | null {
  if (
    !isValidReverseGeocodeCoordinate(lat) ||
    !isValidReverseGeocodeCoordinate(lng)
  ) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return normalizeReverseGeocodeCoordinates(lat, lng)
}
