import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { updateDeepInQueries } from "@/lib/query-state"

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

const isBuildingRecord =
  (buildingId: string) =>
  (value: Record<string, unknown>) =>
    value._id === buildingId &&
    ("buildingType" in value || "location" in value)

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
  updateDeepInQueries(
    queryClient,
    relatedBuildingQueryKeys(building._id),
    isBuildingRecord(building._id),
    (current) => ({ ...current, ...building }),
  )
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
