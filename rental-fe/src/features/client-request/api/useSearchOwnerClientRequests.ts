import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { ClientRequestStatus } from "./clientRequestParsers"
import { searchOwnerClientRequests } from "./searchOwnerClientRequests"

/** Backend defaults omitted status to Waiting; keep the cache key aligned. */
export const DEFAULT_OWNER_CLIENT_REQUEST_STATUS: ClientRequestStatus =
  "Waiting"

export const ownerClientRequestsQueryKey = ({
  status,
  limit,
}: {
  status: ClientRequestStatus
  limit: number
}) => queryKeys.clientRequests.ownerList({ status, limit })

type UseSearchOwnerClientRequestsInput = {
  status?: ClientRequestStatus
  limit?: number
  enabled?: boolean
}

export const ownerClientRequestsQueryOptions = ({
  status = DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerClientRequestsInput = {}) =>
  infiniteQueryOptions({
    queryKey: ownerClientRequestsQueryKey({ status, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerClientRequests({
        status,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchOwnerClientRequests({
  status = DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerClientRequestsInput = {}) {
  return useInfiniteQuery(
    ownerClientRequestsQueryOptions({ status, limit, enabled }),
  )
}
