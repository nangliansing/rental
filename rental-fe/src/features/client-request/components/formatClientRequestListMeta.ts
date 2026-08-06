import type {
  ClientRequest,
  ClientRequestGeoSearch,
} from "@/features/client-request/api"

export function formatClientRequestGeoPreview(
  geoSearch: ClientRequestGeoSearch,
): string {
  const placeName = geoSearch.placeName?.trim()
  if (placeName) return placeName

  if (geoSearch.mode === "nearby") return "Nearby pin"
  if (geoSearch.mode === "line") return "Search line"
  return "Map area"
}

export function formatClientRequestListPreview(
  clientRequest: Pick<ClientRequest, "description" | "geoSearch">,
): string {
  const description = clientRequest.description?.trim()
  if (description) return description
  return formatClientRequestGeoPreview(clientRequest.geoSearch)
}

/** Compact WhatsApp-style timestamp for list rows. */
export function formatClientRequestListTimestamp(
  value: string,
  now = new Date(),
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  if (date >= startOfToday) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  if (date >= startOfYesterday) return "Yesterday"

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(date)
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

/** Cap shown on saved-search list rows (9 → `9+`, higher values stay capped). */
export const SAVED_SEARCH_MATCHING_COUNT_DISPLAY_CAP = 9

/**
 * Formats a matching-building count for list rows.
 * Returns `null` when the count should be hidden (missing / zero / invalid).
 */
export function formatSavedSearchMatchingCount(
  matchingCount: number | null | undefined,
): string | null {
  if (matchingCount == null || !Number.isFinite(matchingCount)) return null
  const count = Math.floor(matchingCount)
  if (count <= 0) return null
  if (count >= SAVED_SEARCH_MATCHING_COUNT_DISPLAY_CAP) {
    return `${SAVED_SEARCH_MATCHING_COUNT_DISPLAY_CAP}+`
  }
  return String(count)
}
