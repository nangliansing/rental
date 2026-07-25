import type { ListingMedia } from "@/features/map-search/types"

export function formatMoney(value: number | null | undefined) {
  if (!isNonNegativeFiniteNumber(value)) return "฿--"

  return "฿" + value.toLocaleString()
}

export function formatCompactMoney(value: number | null | undefined) {
  if (!isNonNegativeFiniteNumber(value)) return "฿--"

  if (value >= 1000) {
    const compactValue = value / 1000
    const label = Number.isInteger(compactValue)
      ? String(compactValue)
      : compactValue.toFixed(1)

    return "฿" + label + "k"
  }

  return formatMoney(value)
}

export function formatRate(value: number | null | undefined) {
  if (!isNonNegativeFiniteNumber(value)) return "฿--"

  return "฿" + value.toLocaleString()
}

export function formatBedroom(count: number | null | undefined) {
  if (!isNonNegativeInteger(count)) return "Room"
  if (count === 0) return "Studio"

  return count === 1 ? "1 bed" : `${count} beds`
}

export function formatBathroom(count: number | null | undefined) {
  if (!isNonNegativeInteger(count)) return "Bath"

  return count === 1 ? "1 bath" : `${count} baths`
}

export function formatContract(months: number | null | undefined) {
  if (!isNonNegativeInteger(months)) return "Contract"

  return months === 1 ? "1 mo" : `${months} mo`
}

export function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "Recently updated"

  const updatedAt = new Date(value).getTime()

  if (Number.isNaN(updatedAt)) return "Recently updated"

  const diffMs = Date.now() - updatedAt
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return "now"
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d`

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export function getSortedListingPhotos(
  media: readonly ListingMedia[] | null | undefined,
) {
  if (!Array.isArray(media)) return []

  return media
    .filter(
      (item): item is ListingMedia =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.secureUrl === "string" &&
        Boolean(item.secureUrl.trim()),
    )
    .sort((first, second) => {
    if (first.isCover && !second.isCover) return -1
    if (!first.isCover && second.isCover) return 1

    return (first.position ?? 0) - (second.position ?? 0)
  })
}

export function buildListingUrl(listingId: string) {
  if (typeof window === "undefined") return undefined

  return window.location.origin + "/listings/" + listingId
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeFiniteNumber(value) && Number.isInteger(value)
}
