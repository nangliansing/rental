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

import {
  searchListingsByAgent,
  type SearchListingsByAgentSort,
} from "./searchListingsByAgent"

export const agentListingsQueryKey = ({
  agentProfileId,
  sort,
  limit,
}: {
  agentProfileId: string
  sort: SearchListingsByAgentSort
  limit: number
}) => queryKeys.agentListings.list({ agentProfileId, sort, limit })

type UseSearchListingsByAgentInput = {
  agentProfileId?: string
  sort?: SearchListingsByAgentSort
  limit?: number
  enabled?: boolean
}

export const agentListingsQueryOptions = ({
  agentProfileId,
  sort = "latest",
  limit = 20,
  enabled = true,
}: UseSearchListingsByAgentInput = {}) =>
  infiniteQueryOptions({
    queryKey: agentListingsQueryKey({
      agentProfileId: agentProfileId ?? "",
      sort,
      limit,
    }),
    enabled: enabled && Boolean(agentProfileId?.trim()),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchListingsByAgent({
        agentProfileId: agentProfileId ?? "",
        sort,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchListingsByAgent({
  agentProfileId,
  sort = "latest",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchListingsByAgentInput = {}) {
  return useInfiniteQuery(
    agentListingsQueryOptions({
      agentProfileId,
      sort,
      limit,
      enabled,
    }),
  )
}
