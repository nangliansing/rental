import type { MapSearchSource } from "../context/MapSearchSessionContext"

const SEARCH_RESULT_SCOPE: Record<MapSearchSource, string> = {
  area: "in this area",
  nearby: "near the pin",
  line: "along the search line",
}

const SEARCH_SCOPE_VISUAL: Record<MapSearchSource, string> = {
  area: "this area",
  nearby: "near this pin",
  line: "along this line",
}

const SEARCH_SCOPE_SHORT: Record<MapSearchSource, string> = {
  area: "this area",
  nearby: "near pin",
  line: "this line",
}

const SEARCH_SCOPE_PANEL_SUFFIX: Record<MapSearchSource, string | null> = {
  area: null,
  nearby: "near pin",
  line: "along line",
}

const SEARCH_SCOPE_LISTING_CONTEXT: Record<MapSearchSource, string> = {
  area: "on the map.",
  nearby: "near your pin.",
  line: "along your line.",
}

const STALE_SEARCH_MESSAGE: Record<MapSearchSource, string> = {
  area: "The map view changed. Search again to update results.",
  nearby: "The pin or search radius changed. Search again to update results.",
  line: "The search line changed. Search again to update results.",
}

export function getSearchResultScopePhrase(source: MapSearchSource) {
  return SEARCH_RESULT_SCOPE[source]
}

export function getSearchScopeVisualPhrase(source: MapSearchSource) {
  return SEARCH_SCOPE_VISUAL[source]
}

export function getSearchScopeShortLabel(source: MapSearchSource) {
  return SEARCH_SCOPE_SHORT[source]
}

export function getSearchScopeListingContext(source: MapSearchSource) {
  return SEARCH_SCOPE_LISTING_CONTEXT[source]
}

export function getStaleSearchAnnouncement(source: MapSearchSource) {
  return STALE_SEARCH_MESSAGE[source]
}

export function formatBuildingCount(buildingCount: number) {
  return `${buildingCount} ${buildingCount === 1 ? "building" : "buildings"}`
}

export function formatBuildingResultsTitle(
  buildingCount: number,
  source: MapSearchSource,
) {
  const suffix = SEARCH_SCOPE_PANEL_SUFFIX[source]
  const countLabel = formatBuildingCount(buildingCount)
  return suffix ? `${countLabel} ${suffix}` : countLabel
}
