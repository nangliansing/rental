import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query"

import type { OptimisticCachePlan } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"
import { removeFromInfiniteListInQueries } from "@/lib/query-state"
import {
  findStatusItem,
  updateStatusCache,
  type StatusCacheSnapshot,
} from "@/lib/status-transition-cache"

import {
  parseClientRequestFilters,
  type ClientRequest,
  type ClientRequestFilters,
  type ClientRequestGeoSearch,
  type SearchOwnerClientRequestsResponse,
} from "./clientRequestParsers"
import { buildCreateOwnerClientRequestGeoSearch } from "./createOwnerClientRequest"

export type OwnerClientRequestsInfiniteData =
  InfiniteData<SearchOwnerClientRequestsResponse>

export type OwnerClientRequestCacheSnapshot = StatusCacheSnapshot<
  ClientRequest,
  SearchOwnerClientRequestsResponse
>

/** Close/update/delete owner writes that conflict on the same request domain. */
export const OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID = "owner-client-request-write"

export type OwnerClientRequestContentPatch = {
  name?: string
  description?: string | null
  geoSearch?: ClientRequestGeoSearch
  filters?: ClientRequestFilters
}

export function ownerClientRequestCachePlan(
  clientRequestId: string,
): OptimisticCachePlan {
  const detailKey = queryKeys.clientRequests.ownerDetail(clientRequestId)

  return {
    cancel: [queryKeys.clientRequests.ownerLists, detailKey],
    snapshot: [queryKeys.clientRequests.ownerLists],
    snapshotExact: [detailKey],
    invalidate: [queryKeys.clientRequests.ownerLists, detailKey],
  }
}

/**
 * Reads the concrete caches to patch after the transaction engine has already
 * cancelled and snapshotted the query family.
 */
export function readOwnerClientRequestCache(
  queryClient: QueryClient,
  clientRequestId: string,
): OwnerClientRequestCacheSnapshot {
  const detailKey = queryKeys.clientRequests.ownerDetail(clientRequestId)

  return {
    detailKey,
    detailData: queryClient.getQueryData<ClientRequest>(detailKey),
    listData: queryClient.getQueriesData<OwnerClientRequestsInfiniteData>({
      queryKey: queryKeys.clientRequests.ownerLists,
    }),
  }
}

export function findOwnerClientRequest(
  detail: ClientRequest | undefined,
  lists: [QueryKey, OwnerClientRequestsInfiniteData | undefined][],
  clientRequestId: string,
) {
  return findStatusItem(detail, lists, clientRequestId)
}

export function createOptimisticClosedClientRequest(
  clientRequest: ClientRequest,
): ClientRequest {
  return {
    ...clientRequest,
    status: "Closed",
  }
}

export function createOptimisticUpdatedClientRequest(
  clientRequest: ClientRequest,
  patch: OwnerClientRequestContentPatch,
): ClientRequest {
  const next: ClientRequest = {
    ...clientRequest,
    status: clientRequest.status,
  }

  if (patch.name !== undefined) {
    next.name = patch.name.trim()
  }

  if (patch.description !== undefined) {
    next.description =
      patch.description === null
        ? null
        : patch.description.trim() || null
  }

  if (patch.geoSearch !== undefined) {
    next.geoSearch = buildCreateOwnerClientRequestGeoSearch(patch.geoSearch)
  }

  if (patch.filters !== undefined) {
    next.filters = parseClientRequestFilters(patch.filters)
  }

  return next
}

export function createOptimisticDeletedClientRequest(
  clientRequest: ClientRequest,
  deletedAt = new Date().toISOString(),
): ClientRequest {
  return {
    ...clientRequest,
    isDeleted: true,
    deletedAt,
  }
}

/** Soft-delete leaves status unchanged, so remove from every owner list variant. */
export function removeOwnerClientRequestFromLists(
  queryClient: QueryClient,
  clientRequestId: string,
) {
  removeFromInfiniteListInQueries<ClientRequest>(
    queryClient,
    [queryKeys.clientRequests.ownerLists],
    item => item._id === clientRequestId,
  )
}

export function updateOwnerClientRequestCache(
  queryClient: QueryClient,
  snapshot: OwnerClientRequestCacheSnapshot,
  clientRequest: ClientRequest,
) {
  updateStatusCache(queryClient, snapshot, clientRequest)
}

export function softDeleteOwnerClientRequestCache(
  queryClient: QueryClient,
  clientRequestId: string,
  deleted: ClientRequest,
) {
  removeOwnerClientRequestFromLists(queryClient, clientRequestId)
  queryClient.setQueryData(
    queryKeys.clientRequests.ownerDetail(clientRequestId),
    deleted,
  )
}
