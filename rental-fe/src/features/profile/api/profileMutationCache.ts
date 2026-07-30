import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  cancelQueriesByKey,
  captureQueriesByKey,
  restoreQueryCacheSnapshot,
  type QueryCacheSnapshot,
} from "@/lib/query-cache-snapshot"
import { updateDeepInQueries } from "@/lib/query-state"
import { isQueryStateRecord } from "@/lib/query-state/shared"

import type { AgentProfile } from "./createAgentProfile"
import type { AgentProfileFormSubmitValues } from "../components/AgentProfileForm"

export type ProfileCacheSnapshot = QueryCacheSnapshot

export const PROFILE_WRITE_SCOPE_ID = "profile-write"

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
  queryKeys.admin.platformAdmins.lists,
  queryKeys.admin.users.details,
]

const isAgentProfileProjection =
  (profileId: string) =>
  (value: Record<string, unknown>) =>
    value._id === profileId &&
    ("displayName" in value ||
      "profilePhoto" in value ||
      "userId" in value)

function definedChanges(
  changes: AgentProfileFormSubmitValues | Partial<AgentProfile>,
) {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  )
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
  if (Object.keys(patch).length === 0) return

  updateDeepInQueries(
    queryClient,
    queryKeysToUpdate,
    isAgentProfileProjection(profileId),
    (current) => ({ ...current, ...patch }),
  )
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

export const deletedProfileCollectionsToRefresh: QueryKey[] = [
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.savedListings.all,
]

export async function reconcileDeletedProfileQueries(queryClient: QueryClient) {
  removeDeletedProfileQueries(queryClient)

  await Promise.all(
    deletedProfileCollectionsToRefresh.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  )
}

export function removeDeletedProfileQueries(queryClient: QueryClient) {
  const failures: unknown[] = []

  deletedProfileQueriesToRemove.forEach((queryKey) => {
    try {
      queryClient.removeQueries({ queryKey })
    } catch (error) {
      failures.push(error)
    }
  })

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      "Unable to remove every deleted-profile cache family.",
    )
  }
}

export function cacheMyAgentProfile(
  queryClient: QueryClient,
  profile: AgentProfile,
) {
  queryClient.setQueryData(queryKeys.profiles.me, profile)
  queryClient.setQueryData(
    queryKeys.profiles.detail(profile._id),
    (current: unknown) =>
      isQueryStateRecord(current) ? { ...current, ...profile } : profile,
  )
}
