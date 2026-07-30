import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  captureStatusCache,
  findStatusItem,
  invalidateStatusCache,
  restoreStatusCache,
  statusFilterFromQueryKey,
  transitionStatusItemInInfiniteData,
  updateStatusCache,
  type StatusCacheSnapshot,
} from "@/lib/status-transition-cache"

import type {
  AdminBuildingEditRequest,
  AdminBuildingEditRequestStatus,
} from "./buildingEditRequestTypes"
import type {
  AdminBuildingEditRequestStatusFilter,
  SearchAdminBuildingEditRequestsResponse,
} from "./searchAdminBuildingEditRequests"

export type AdminBuildingEditRequestsInfiniteData =
  InfiniteData<SearchAdminBuildingEditRequestsResponse>

/** Approve and reject are conflicting writes to the same request domain. */
export const ADMIN_BUILDING_EDIT_REQUEST_WRITE_SCOPE_ID =
  "admin-building-edit-request-write"

export function getBuildingEditStatusFromQueryKey(
  queryKey: QueryKey,
): AdminBuildingEditRequestStatusFilter | undefined {
  return statusFilterFromQueryKey(queryKey) as
    | AdminBuildingEditRequestStatusFilter
    | undefined
}

export function findBuildingEditRequest(
  detail: AdminBuildingEditRequest | undefined,
  lists: [QueryKey, AdminBuildingEditRequestsInfiniteData | undefined][],
  requestId: string,
) {
  return findStatusItem(detail, lists, requestId)
}

export function transitionBuildingEditRequestInInfiniteData(
  current: AdminBuildingEditRequestsInfiniteData | undefined,
  statusFilter: AdminBuildingEditRequestStatusFilter | undefined,
  transitionedRequest: AdminBuildingEditRequest,
): AdminBuildingEditRequestsInfiniteData | undefined {
  return transitionStatusItemInInfiniteData(
    current,
    statusFilter,
    transitionedRequest,
  )
}

export function createOptimisticBuildingEditTransition(
  request: AdminBuildingEditRequest,
  status: AdminBuildingEditRequestStatus,
  reviewReason: string,
): AdminBuildingEditRequest {
  return {
    ...request,
    status,
    reviewReason: reviewReason.trim(),
  }
}

export type BuildingEditRequestCacheSnapshot = StatusCacheSnapshot<
  AdminBuildingEditRequest,
  SearchAdminBuildingEditRequestsResponse
>

export async function captureBuildingEditRequestCache(
  queryClient: QueryClient,
  requestId: string,
): Promise<BuildingEditRequestCacheSnapshot> {
  return captureStatusCache<
    AdminBuildingEditRequest,
    SearchAdminBuildingEditRequestsResponse
  >(
    queryClient,
    queryKeys.admin.buildingEditRequests.lists,
    queryKeys.admin.buildingEditRequests.detail(requestId),
  )
}

/**
 * Reads the concrete caches to patch after the transaction engine has already
 * cancelled and snapshotted the query family.
 */
export function readBuildingEditRequestCache(
  queryClient: QueryClient,
  requestId: string,
): BuildingEditRequestCacheSnapshot {
  const detailKey = queryKeys.admin.buildingEditRequests.detail(requestId)

  return {
    detailKey,
    detailData:
      queryClient.getQueryData<AdminBuildingEditRequest>(detailKey),
    listData:
      queryClient.getQueriesData<AdminBuildingEditRequestsInfiniteData>({
        queryKey: queryKeys.admin.buildingEditRequests.lists,
      }),
  }
}

export function updateBuildingEditRequestCache(
  queryClient: QueryClient,
  snapshot: BuildingEditRequestCacheSnapshot,
  request: AdminBuildingEditRequest,
) {
  updateStatusCache(queryClient, snapshot, request)
}

export function restoreBuildingEditRequestCache(
  queryClient: QueryClient,
  snapshot: BuildingEditRequestCacheSnapshot,
) {
  restoreStatusCache(queryClient, snapshot)
}

export async function invalidateBuildingEditRequestCache(
  queryClient: QueryClient,
  requestId: string,
) {
  await invalidateStatusCache(
    queryClient,
    queryKeys.admin.buildingEditRequests.lists,
    queryKeys.admin.buildingEditRequests.detail(requestId),
  )
}
