import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  cancelQueriesByKey,
  captureQueriesByKey,
  restoreQueryCacheSnapshot,
  type QueryCacheSnapshot,
} from "@/lib/query-cache-snapshot"

import type { AgentProfile } from "./createAgentProfile"
import type { AgentProfileFormSubmitValues } from "../components/AgentProfileForm"

export type ProfileCacheSnapshot = QueryCacheSnapshot

export const profileProjectionQueryKeys: QueryKey[] = [
  queryKeys.profiles.me,
  queryKeys.profiles.details,
  queryKeys.agentListings.lists,
  queryKeys.listings.ownerLists,
  queryKeys.listings.ownerDetails,
  queryKeys.listings.publicDetails,
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.savedListings.all,
  queryKeys.listerReviews.lists,
  queryKeys.listerReviewTeasers.lists,
  queryKeys.admin.pendingPosts.lists,
  queryKeys.admin.buildingEditRequests.lists,
  queryKeys.admin.buildingEditRequests.details,
  queryKeys.admin.reports.lists,
  queryKeys.admin.reports.details,
  queryKeys.admin.reviewReports.lists,
  queryKeys.admin.reviewReports.details,
  queryKeys.admin.platformAdmins.list,
  queryKeys.admin.users.details,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isAgentProfileProjection(
  value: Record<string, unknown>,
  profileId: string,
) {
  return (
    value._id === profileId &&
    ("displayName" in value || "profilePhoto" in value || "userId" in value)
  )
}

function definedChanges(
  changes: AgentProfileFormSubmitValues | Partial<AgentProfile>,
) {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  )
}

function patchAgentProfileProjection<T>(
  value: T,
  profileId: string,
  changes: Record<string, unknown>,
): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = patchAgentProfileProjection(item, profileId, changes)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  let next: Record<string, unknown> = value
  if (isAgentProfileProjection(value, profileId)) {
    next = { ...value, ...changes }
  }

  for (const [key, child] of Object.entries(next)) {
    const patched = patchAgentProfileProjection(child, profileId, changes)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }

  return next as T
}

export async function cancelProfileProjectionQueries(
  queryClient: QueryClient,
  queryKeysToCancel: QueryKey[] = profileProjectionQueryKeys,
) {
  await cancelQueriesByKey(queryClient, queryKeysToCancel)
}

export function captureProfileProjectionQueries(
  queryClient: QueryClient,
  queryKeysToCapture: QueryKey[] = profileProjectionQueryKeys,
) {
  return captureQueriesByKey(queryClient, queryKeysToCapture)
}

export function restoreProfileProjectionQueries(
  queryClient: QueryClient,
  snapshots: ProfileCacheSnapshot,
) {
  restoreQueryCacheSnapshot(queryClient, snapshots)
}

export function updateAgentProfileProjections(
  queryClient: QueryClient,
  profileId: string,
  changes: AgentProfileFormSubmitValues | Partial<AgentProfile>,
  queryKeysToUpdate: QueryKey[] = profileProjectionQueryKeys,
) {
  const patch = definedChanges(changes)

  queryKeysToUpdate.forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, (current) =>
      patchAgentProfileProjection(current, profileId, patch),
    )
  })
}

export const deletedProfileQueryKeys: QueryKey[] = [
  ...profileProjectionQueryKeys,
  queryKeys.pendingPosts.ownerLists,
]

const deletedProfileQueriesToRemove: QueryKey[] = [
  queryKeys.profiles.me,
  queryKeys.profiles.details,
  queryKeys.agentListings.lists,
  queryKeys.listings.ownerLists,
  queryKeys.listings.ownerDetails,
  queryKeys.listings.publicDetails,
  queryKeys.pendingPosts.ownerLists,
  queryKeys.listerReviews.lists,
]

const deletedProfileCollectionsToRefresh: QueryKey[] = [
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.savedListings.all,
]

export async function reconcileDeletedProfileQueries(queryClient: QueryClient) {
  deletedProfileQueriesToRemove.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey })
  })

  await Promise.all(
    deletedProfileCollectionsToRefresh.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  )
}

export function cacheMyAgentProfile(
  queryClient: QueryClient,
  profile: AgentProfile,
) {
  queryClient.setQueryData(queryKeys.profiles.me, profile)
  queryClient.setQueryData(
    queryKeys.profiles.detail(profile._id),
    (current: unknown) =>
      isRecord(current) ? { ...current, ...profile } : profile,
  )
}
