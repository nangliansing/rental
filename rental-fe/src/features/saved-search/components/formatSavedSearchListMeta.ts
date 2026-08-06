import type {
  SavedSearch,
  SavedSearchGeoSearch,
} from "@/features/saved-search/api"

export function formatSavedSearchGeoPreview(
  geoSearch: SavedSearchGeoSearch,
): string {
  const placeName = geoSearch.placeName?.trim()
  if (placeName) return placeName

  if (geoSearch.mode === "nearby") return "Nearby pin"
  if (geoSearch.mode === "line") return "Search line"
  return "Map area"
}

export function formatSavedSearchListPreview(
  savedSearch: Pick<SavedSearch, "description" | "geoSearch">,
): string {
  const description = savedSearch.description?.trim()
  if (description) return description
  return formatSavedSearchGeoPreview(savedSearch.geoSearch)
}

/** Compact WhatsApp-style timestamp for list rows. */
export function formatSavedSearchListTimestamp(
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

/** Backend classification limit for an owner SavedSearch list row. */
export const SAVED_SEARCH_MATCHING_BUILDING_LIMIT = 20

/** Formats the lower-bound total when the backend's sample was truncated. */
export function formatCappedSavedSearchMatchingTotal(
  myCount: number,
  platformCount: number,
): string {
  const sampledTotal = Math.max(0, myCount) + Math.max(0, platformCount)
  return `${Math.max(SAVED_SEARCH_MATCHING_BUILDING_LIMIT, sampledTotal)}+ total`
}
