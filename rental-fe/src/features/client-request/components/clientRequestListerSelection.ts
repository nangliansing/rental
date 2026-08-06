import type { SearchAgentProfile } from "@/features/agent"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

function normalizeAgentProfileIds(ids: string[] | undefined): string[] | undefined {
  const next = [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))]
  return next.length > 0 ? next : undefined
}

/** Toggle a lister in draft selection + `filters.agentProfileIds`. */
export function toggleClientRequestSelectedLister(
  selectedListers: SearchAgentProfile[],
  filters: MapSearchFilters,
  lister: SearchAgentProfile,
): {
  selectedListers: SearchAgentProfile[]
  filters: MapSearchFilters
} {
  const isSelected = selectedListers.some((entry) => entry._id === lister._id)

  if (isSelected) {
    const nextSelected = selectedListers.filter((entry) => entry._id !== lister._id)
    return {
      selectedListers: nextSelected,
      filters: {
        ...filters,
        agentProfileIds: normalizeAgentProfileIds(
          nextSelected.map((entry) => entry._id),
        ),
      },
    }
  }

  const nextSelected = [
    ...selectedListers.filter((entry) => entry._id !== lister._id),
    lister,
  ]

  return {
    selectedListers: nextSelected,
    filters: {
      ...filters,
      agentProfileIds: normalizeAgentProfileIds(
        nextSelected.map((entry) => entry._id),
      ),
    },
  }
}

/** Remove a selected lister by id from draft selection + filters. */
export function removeClientRequestSelectedLister(
  selectedListers: SearchAgentProfile[],
  filters: MapSearchFilters,
  listerId: string,
): {
  selectedListers: SearchAgentProfile[]
  filters: MapSearchFilters
} {
  const nextSelected = selectedListers.filter((entry) => entry._id !== listerId)

  return {
    selectedListers: nextSelected,
    filters: {
      ...filters,
      agentProfileIds: normalizeAgentProfileIds(
        nextSelected.map((entry) => entry._id),
      ),
    },
  }
}

/** Clear preference filters while keeping selected lister IDs. */
export function clearClientRequestPreferenceFilters(
  filters: MapSearchFilters,
): MapSearchFilters {
  const agentProfileIds = normalizeAgentProfileIds(filters.agentProfileIds)
  return agentProfileIds ? { agentProfileIds } : {}
}
