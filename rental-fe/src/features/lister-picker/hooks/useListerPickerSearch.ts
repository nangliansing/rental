import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query"
import { useDebouncedCallback } from "use-debounce"
import { useEffect, useState } from "react"

import {
  searchAgentProfiles,
  type SearchAgentProfile,
} from "@/features/agent"
import { LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH } from "@/features/agent"
import { AGENT_TYPEAHEAD_PAGE_SIZE } from "@/features/agent/hooks/useAgentTypeahead"
import { queryKeys } from "@/lib/query-keys"

const LISTER_PICKER_SEARCH_DEBOUNCE_MS = 300

type UseListerPickerSearchInput = {
  query: string
  enabled?: boolean
  pageSize?: number
}

/**
 * Lister picker browse/search results.
 *
 * Agents search supports query + limit only (no `page`). We grow `limit` per
 * “page” so the UI can infinite-scroll until a real cursor API exists.
 */
export function useListerPickerSearch({
  query,
  enabled = true,
  pageSize = AGENT_TYPEAHEAD_PAGE_SIZE,
}: UseListerPickerSearchInput) {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim())

  const applyDebouncedQuery = useDebouncedCallback((value: string) => {
    setDebouncedQuery(value.trim())
  }, LISTER_PICKER_SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    applyDebouncedQuery(query)
    return () => applyDebouncedQuery.cancel()
  }, [applyDebouncedQuery, query])

  const canSearch =
    enabled && debouncedQuery.length >= LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH

  const getNextListerPickerPageParam = (
    lastPage: SearchAgentProfile[],
    _pages: SearchAgentProfile[][],
    lastPageParam: number,
  ): number | undefined => {
    if (!Number.isSafeInteger(lastPageParam) || lastPageParam < 1) {
      return undefined
    }
    if (lastPage.length < lastPageParam) return undefined
    return lastPageParam + pageSize
  }

  const searchQuery = useInfiniteQuery(infiniteQueryOptions({
    queryKey: queryKeys.agentProfileSearch.list({
      query: debouncedQuery,
      limit: pageSize,
    }),
    enabled: canSearch,
    initialPageParam: pageSize,
    queryFn: ({ pageParam, signal }) =>
      searchAgentProfiles({
        query: debouncedQuery,
        limit: pageParam,
        signal,
      }),
    getNextPageParam: getNextListerPickerPageParam,
  }))

  const listers: SearchAgentProfile[] = canSearch
    ? (searchQuery.data?.pages.at(-1) ?? [])
    : []

  return {
    listers,
    debouncedQuery,
    isLoading: canSearch && searchQuery.isPending,
    isError: canSearch && searchQuery.isError,
    isFetching: searchQuery.isFetching,
    hasNextPage: Boolean(canSearch && searchQuery.hasNextPage),
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    fetchNextPage: () => {
      if (!searchQuery.hasNextPage || searchQuery.isFetchingNextPage) return
      void searchQuery.fetchNextPage()
    },
    refetch: () => void searchQuery.refetch(),
  }
}
