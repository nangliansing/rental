import type { BuildingListing, SearchBuilding } from "../types"
import {
  formatCompactMoney,
  formatContract as formatListingContract,
  formatRate as formatListingRate,
  getSortedListingPhotos,
} from "@/features/listing/utils/listingDisplay"

export function formatCompactBaht(value: number) {
  return formatCompactMoney(value)
}

export function formatBuildingRent(building: SearchBuilding) {
  if (!isNonNegativeFiniteNumber(building.minRent)) return "No rent yet"

  return "฿" + building.minRent.toLocaleString() + "+"
}

export function formatBuildingMarkerLabel(building: SearchBuilding) {
  if (building.minRent == null) return building.name

  return formatCompactBaht(building.minRent)
}

export function isListingOnlyBuilding(
  building: SearchBuilding,
  isListingSearch: boolean,
) {
  return isListingSearch && building.listings.length === 0
}

export function formatDistance(distanceMeters?: number) {
  if (!isNonNegativeFiniteNumber(distanceMeters)) return null

  if (distanceMeters >= 1000) {
    return (distanceMeters / 1000).toFixed(1) + "km away"
  }

  return Math.round(distanceMeters).toLocaleString() + "m away"
}

export function formatContract(months: number) {
  return formatListingContract(months)
}

export function formatRate(value: number) {
  return formatListingRate(value)
}

export function formatBedroomCount(count: number) {
  if (!isNonNegativeInteger(count)) return "Room"

  return count === 0 ? "Studio" : String(count)
}

export function getListingCoverUrl(listing: BuildingListing) {
  return getSortedListingPhotos(listing.media)[0]?.secureUrl ?? null
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeFiniteNumber(value) && Number.isInteger(value)
}
