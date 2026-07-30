import type { QueryClient } from "@tanstack/react-query"

import {
  createOptimisticTransaction,
  type OptimisticCachePlan,
} from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import {
  createOptimisticBuildingEditTransition,
  findBuildingEditRequest,
  readBuildingEditRequestCache,
  updateBuildingEditRequestCache,
} from "./adminBuildingEditRequestCache"
import type {
  AdminBuildingEditRequest,
  AdminBuildingEditRequestStatus,
} from "./buildingEditRequestTypes"

type BuildingEditRequestMutationVariables = {
  buildingEditRequestId: string
}

type BuildingEditRequestOptimisticContext = {
  requestId: string
}

type Config<TData, TVariables extends BuildingEditRequestMutationVariables> = {
  queryClient: QueryClient
  status: AdminBuildingEditRequestStatus
  getReviewReason: (variables: TVariables) => string
  getRequest: (data: TData) => AdminBuildingEditRequest
}

function normalizeRequestId(
  variables: BuildingEditRequestMutationVariables,
): string {
  return variables.buildingEditRequestId.trim()
}

export function buildingEditRequestCachePlan(
  requestId: string,
): OptimisticCachePlan {
  const detailKey = queryKeys.admin.buildingEditRequests.detail(requestId)

  return {
    cancel: [queryKeys.admin.buildingEditRequests.lists, detailKey],
    snapshot: [queryKeys.admin.buildingEditRequests.lists],
    snapshotExact: [detailKey],
    invalidate: [queryKeys.admin.buildingEditRequests.lists, detailKey],
  }
}

/**
 * Shared optimistic lifecycle for every terminal building-edit transition.
 * TanStack's shared mutation scope serializes conflicting server writes, while
 * the transaction's per-request key prevents stale cache reconciliation.
 */
export function createAdminBuildingEditRequestTransaction<
  TData,
  TVariables extends BuildingEditRequestMutationVariables,
>({
  queryClient,
  status,
  getReviewReason,
  getRequest,
}: Config<TData, TVariables>) {
  return createOptimisticTransaction<
    TData,
    Error,
    TVariables,
    BuildingEditRequestOptimisticContext
  >({
    queryClient,
    getPlan: (variables) =>
      buildingEditRequestCachePlan(normalizeRequestId(variables)),
    scopeKey: (variables) =>
      `admin-building-edit-request:${normalizeRequestId(variables)}`,
    apply: ({ variables }) => {
      const requestId = normalizeRequestId(variables)
      const cache = readBuildingEditRequestCache(queryClient, requestId)
      const currentRequest = findBuildingEditRequest(
        cache.detailData,
        cache.listData,
        requestId,
      )

      if (currentRequest) {
        updateBuildingEditRequestCache(
          queryClient,
          cache,
          createOptimisticBuildingEditTransition(
            currentRequest,
            status,
            getReviewReason(variables),
          ),
        )
      }

      return { requestId }
    },
    reconcile: ({ data, optimisticContext }) => {
      updateBuildingEditRequestCache(
        queryClient,
        readBuildingEditRequestCache(
          queryClient,
          optimisticContext.requestId,
        ),
        getRequest(data),
      )
    },
  })
}
