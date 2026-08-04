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
