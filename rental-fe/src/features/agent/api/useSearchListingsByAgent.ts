import { useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
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

export function useSearchListingsByAgent({
  agentProfileId,
  sort = "latest",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchListingsByAgentInput = {}) {
  return useInfiniteQuery({
    queryKey: agentListingsQueryKey({
      agentProfileId: agentProfileId ?? "",
      sort,
      limit,
    }),
    enabled: enabled && Boolean(agentProfileId),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchListingsByAgent({
        agentProfileId: agentProfileId!,
        sort,
        page: Number(pageParam),
        limit,
        signal,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination
      const loaded = page * limit

      return loaded < total ? page + 1 : undefined
    },
  })
}
