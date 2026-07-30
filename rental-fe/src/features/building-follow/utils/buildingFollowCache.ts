import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  removeDeep,
  updateDeep,
  updateDeepInQueries,
} from "@/lib/query-state"
import { applyToCachedQueries } from "@/lib/query-state/shared"

export const BUILDING_FOLLOW_WRITE_SCOPE_ID = "building-follow-write"

export const relatedBuildingFollowQueryKeys: QueryKey[] = [
  queryKeys.buildingFollows.all,
  queryKeys.buildings.all,
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.listings.publicDetails,
  queryKeys.listings.ownerDetails,
]

const isBuildingFollowingStateTarget =
  (buildingId: string) => (value: Record<string, unknown>) =>
    value._id === buildingId &&
    ("buildingType" in value ||
      "location" in value ||
      "isFollowing" in value)

/** Follow row keyed by building id, not the building record itself. */
const isBuildingFollowRow =
  (buildingId: string) => (value: Record<string, unknown>) =>
    value.buildingId === buildingId &&
    typeof value._id === "string" &&
    value._id !== buildingId

function removeBuildingFollowRowsFromCache(
  queryClient: QueryClient,
  buildingId: string,
) {
  applyToCachedQueries(
    queryClient,
    [queryKeys.buildingFollows.all],
    (current) =>
      removeDeep(
        updateDeep(
          current,
          isBuildingFollowingStateTarget(buildingId),
          (building) => ({ ...building, isFollowing: false }),
        ),
        isBuildingFollowRow(buildingId),
      ),
  )
}

export function patchBuildingFollowingStateInCache({
  queryClient,
  buildingId,
  isFollowing,
}: {
  queryClient: QueryClient
  buildingId: string
  isFollowing: boolean
}) {
  updateDeepInQueries(
    queryClient,
    relatedBuildingFollowQueryKeys,
    isBuildingFollowingStateTarget(buildingId),
    (building) =>
      building.isFollowing === isFollowing
        ? building
        : { ...building, isFollowing },
  )
}

export function applyDeletedBuildingFollowToCache(
  queryClient: QueryClient,
  buildingId: string,
) {
  patchBuildingFollowingStateInCache({
    queryClient,
    buildingId,
    isFollowing: false,
  })
  removeBuildingFollowRowsFromCache(queryClient, buildingId)
}

export async function syncBuildingFollowingState({
  queryClient,
  buildingId,
  isFollowing,
}: {
  queryClient: QueryClient
  buildingId: string
  isFollowing: boolean
}) {
  patchBuildingFollowingStateInCache({ queryClient, buildingId, isFollowing })

  if (!isFollowing) {
    removeBuildingFollowRowsFromCache(queryClient, buildingId)
    return
  }

  // Create responses do not contain the populated building required by
  // the followings list. Refresh that collection without refetching the
  // building feed or detail currently being viewed.
  await queryClient.invalidateQueries({
    queryKey: queryKeys.buildingFollows.all,
  })
}
