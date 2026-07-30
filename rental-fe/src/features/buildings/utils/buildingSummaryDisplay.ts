import { formatCompactBaht } from "@/features/map-search/utils/building-display"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"

export type BuildingSummaryData = {
  _id?: string
  name: string
  buildingType?: string | null
  address?: string | null
  facilities?: readonly string[] | null
  security?: readonly string[] | null
  minRent?: number | null
  maxRent?: number | null
  isFollowing?: boolean
  location?: {
    coordinates?: readonly number[] | null
  } | null
}

export type NormalizedBuildingSummary = {
  id: string
  name: string
  buildingType: string | null
  address: string | null
  facilities: string[]
  security: string[]
  minRent: number | null
  maxRent: number | null
  coordinates: { lat: number; lng: number } | null
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []

  const seen = new Set<string>()

  return values.reduce<string[]>((items, value) => {
    if (typeof value !== "string") return items

    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) return items

    seen.add(trimmed)
    items.push(trimmed)
    return items
  }, [])
}

export function normalizeRent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null
  }

  return value
}

export function normalizeBuildingId(value: unknown): string {
  return normalizeOptionalText(value) ?? ""
}

export function getBuildingSummaryCoordinates(
  location: BuildingSummaryData["location"],
): { lat: number; lng: number } | null {
  const coordinates = location?.coordinates
  const lng = coordinates?.[0]
  const lat = coordinates?.[1]

  if (
    typeof lng !== "number" ||
    typeof lat !== "number" ||
    !isValidMapPosition({ lat, lng })
  ) {
    return null
  }

  return { lat, lng }
}

export function formatBuildingSummaryRent(
  minRent: number | null,
  maxRent: number | null,
): string {
  if (minRent == null) return "No rent yet"

  if (maxRent == null || maxRent === minRent) {
    return `${formatCompactBaht(minRent)}+`
  }

  return `${formatCompactBaht(minRent)} - ${formatCompactBaht(maxRent)}`
}

export function normalizeBuildingSummary(
  building: BuildingSummaryData,
  { showCoordinates = false }: { showCoordinates?: boolean } = {},
): NormalizedBuildingSummary {
  const minRent = normalizeRent(building.minRent)
  const maxRent = normalizeRent(building.maxRent)
  const coordinates = showCoordinates
    ? getBuildingSummaryCoordinates(building.location)
    : null

  return {
    id: normalizeBuildingId(building._id),
    name: normalizeOptionalText(building.name) ?? "Building",
    buildingType: normalizeOptionalText(building.buildingType),
    address: normalizeOptionalText(building.address),
    facilities: normalizeStringArray(building.facilities),
    security: normalizeStringArray(building.security),
    minRent,
    maxRent:
      minRent != null && maxRent != null && maxRent < minRent ? minRent : maxRent,
    coordinates,
  }
}
