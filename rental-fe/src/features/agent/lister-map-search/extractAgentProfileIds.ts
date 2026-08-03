import type { MapSearchFilters } from "@/features/map-search/filters/types"

function normalizeAgentProfileId(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function extractAgentProfileIds(
  filters: MapSearchFilters | undefined,
): string[] {
  if (!filters) return []

  const ids = [
    ...(filters.agentProfileIds ?? []),
    ...(filters.listerIds ?? []),
  ]

  const normalizedIds = ids
    .map(normalizeAgentProfileId)
    .filter((id): id is string => id !== null)

  return [...new Set(normalizedIds)]
}
