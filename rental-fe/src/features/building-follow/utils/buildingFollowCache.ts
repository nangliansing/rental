import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  removeDeep,
  updateDeep,
  updateDeepInQueries,
} from "@/lib/query-state"
import {
  applyToCachedQueries,
  forEachCachedQuery,
  isQueryStateRecord,
  MAX_TRAVERSAL_DEPTH,
  readArrayLength,
  safeMatch,
} from "@/lib/query-state/shared"

export const BUILDING_FOLLOW_WRITE_SCOPE_ID = "building-follow-write"

/** Building records that expose viewer-specific `isFollowing`. */
export const buildingFollowingStateQueryKeys: QueryKey[] = [
  queryKeys.buildings.all,
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.listings.publicDetails,
  queryKeys.listings.ownerDetails,
]

export const relatedBuildingFollowQueryKeys: QueryKey[] = [
  queryKeys.buildingFollows.all,
  ...buildingFollowingStateQueryKeys,
]

/** Followings list needs a refetch after create; create payloads omit populated buildings. */
export const buildingFollowRefetchQueryKeys: QueryKey[] = [
  queryKeys.buildingFollows.all,
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

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function findBuildingFollowingInValue(
  value: unknown,
  buildingId: string,
  path: WeakSet<object>,
  depth: number,
): boolean | undefined {
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined

  if (Array.isArray(value)) {
    if (path.has(value)) return undefined

    const length = readArrayLength(value)
    if (length === undefined) return undefined

    path.add(value)
    try {
      for (let index = 0; index < length; index += 1) {
        const found = findBuildingFollowingInValue(
          value[index],
          buildingId,
          path,
          depth + 1,
        )
        if (found !== undefined) return found
      }
      return undefined
    } finally {
      path.delete(value)
    }
  }

  if (!isQueryStateRecord(value)) return undefined
  if (path.has(value)) return undefined

  path.add(value)
  try {
    if (
      safeMatch(isBuildingFollowingStateTarget(buildingId), value) &&
      readBoolean(value.isFollowing) !== undefined
    ) {
      return readBoolean(value.isFollowing)
    }

    for (const child of Object.values(value)) {
      const found = findBuildingFollowingInValue(
        child,
        buildingId,
        path,
        depth + 1,
      )
      if (found !== undefined) return found
    }

    return undefined
  } finally {
    path.delete(value)
  }
}

/**
 * Reads the latest patched `isFollowing` value for a building from building
 * detail/search caches. Followings-list rows are intentionally excluded because
 * their nested building snapshots do not carry viewer follow state.
 */
export function readBuildingFollowingFromCache(
  queryClient: QueryClient,
  buildingId: string,
): boolean | undefined {
  if (!buildingId) return undefined

  let resolved: boolean | undefined
  let resolvedUpdatedAt = -1

  forEachCachedQuery(
    queryClient,
    buildingFollowingStateQueryKeys,
    ({ queryHash, queryKey }) => {
      try {
        const current = queryClient.getQueryData(queryKey)
        const found = findBuildingFollowingInValue(
          current,
          buildingId,
          new WeakSet(),
          0,
        )
        if (found === undefined) return

        const updatedAt =
          queryClient.getQueryCache().get(queryHash)?.state.dataUpdatedAt ?? 0
        if (updatedAt >= resolvedUpdatedAt) {
          resolved = found
          resolvedUpdatedAt = updatedAt
        }
      } catch {
        // Skip unreadable cache entries.
      }
    },
  )

  return resolved
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
