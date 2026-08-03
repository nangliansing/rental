import { DEFAULT_MAP_SEARCH_FILTERS } from "@/features/map-search/context/MapSearchFilterContext"
import { writeMapSearchUrl } from "@/features/map-search/utils/map-search-url"

export function buildListerMapSearchUrl(agentProfileId: string): string {
  if (typeof agentProfileId !== "string") return "/"

  const trimmedId = agentProfileId.trim()
  if (!trimmedId) return "/"

  const params = writeMapSearchUrl(new URLSearchParams(), {
    source: null,
    position: null,
    bounds: null,
    linePoints: [],
    radiusMeters: 1_000,
    filters: {
      ...DEFAULT_MAP_SEARCH_FILTERS,
      agentProfileIds: [trimmedId],
    },
    buildingId: null,
    listingId: null,
  })

  const query = params.toString()
  return query ? `/?${query}` : "/"
}
