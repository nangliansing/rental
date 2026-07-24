import type {
  MapSearchSource,
  MapSearchStatus,
} from "../context/MapSearchSessionContext"

import {
  formatBuildingCount,
  getSearchResultScopePhrase,
  getStaleSearchAnnouncement,
} from "./map-search-presentation"

export function getMapSearchAnnouncement({
  status,
  source,
  buildingCount,
}: {
  status: MapSearchStatus
  source: MapSearchSource
  buildingCount: number
}) {
  const scope = getSearchResultScopePhrase(source)

  if (status === "loading") {
    return `Searching for buildings ${scope}.`
  }

  if (status === "stale") {
    return getStaleSearchAnnouncement(source)
  }

  if (status === "error") {
    return buildingCount > 0
      ? `The search could not be updated. Showing ${formatBuildingCount(buildingCount)}.`
      : "The building search failed. Try again."
  }

  if (status === "empty") {
    return `No buildings found ${scope}.`
  }

  if (status === "success") {
    return `${formatBuildingCount(buildingCount)} found ${scope}.`
  }

  return ""
}
