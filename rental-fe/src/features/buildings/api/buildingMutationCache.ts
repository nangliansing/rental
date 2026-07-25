import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

export type BuildingCachePatch = {
  _id: string
  name: string
  buildingType: string
  facilities: string[]
  security: string[]
  location: unknown
  address: string | null
  minRent: number | null
  maxRent: number | null
}

export const relatedBuildingQueryKeys = (buildingId: string): QueryKey[] => [
  queryKeys.buildings.detail(buildingId),
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.listings.ownerLists,
  queryKeys.listings.ownerDetails,
  queryKeys.listings.publicDetails,
  queryKeys.agentListings.lists,
  queryKeys.savedListings.all,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function patchBuilding<T>(value: T, building: BuildingCachePatch): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = patchBuilding(item, building)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  const isBuilding =
    value._id === building._id &&
    ("buildingType" in value || "location" in value)
  let next: Record<string, unknown> = isBuilding
    ? { ...value, ...building }
    : value

  for (const [key, child] of Object.entries(next)) {
    const patched = patchBuilding(child, building)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }

  return next as T
}

export async function cancelRelatedBuildingQueries(
  queryClient: QueryClient,
  buildingId: string,
) {
  await Promise.all(
    relatedBuildingQueryKeys(buildingId).map((queryKey) =>
      queryClient.cancelQueries({ queryKey }),
    ),
  )
}

export function patchBuildingInRelatedQueries(
  queryClient: QueryClient,
  building: BuildingCachePatch,
) {
  const patchedQueries = new Set<string>()

  relatedBuildingQueryKeys(building._id).forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        if (patchedQueries.has(query.queryHash)) return
        patchedQueries.add(query.queryHash)
        queryClient.setQueryData(query.queryKey, (current: unknown) =>
          patchBuilding(current, building),
        )
      })
  })
}

export async function invalidateRelatedBuildingQueries(
  queryClient: QueryClient,
  buildingId: string,
) {
  await Promise.all(
    relatedBuildingQueryKeys(buildingId).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  )
}
