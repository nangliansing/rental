import { useCallback, useEffect, useRef, useState } from "react"

import {
  searchAgentProfiles,
  type SearchAgentProfile,
} from "../api/searchAgentProfiles"

import { LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH } from "../lister-autocomplete/constants"

const AGENT_SEARCH_ERROR = "Agent search is unavailable. Try again."

/** Page size for typeahead; “load more” grows limit until API supports `page`. */
export const AGENT_TYPEAHEAD_PAGE_SIZE = 20

export function useAgentTypeahead() {
  const requestRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchAgentProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [limit, setLimit] = useState(AGENT_TYPEAHEAD_PAGE_SIZE)

  const cancelRequest = useCallback(() => {
    requestRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const stopSearch = useCallback(() => {
    cancelRequest()
    setIsLoading(false)
    setIsFetchingNextPage(false)
  }, [cancelRequest])

  const clearError = useCallback(() => setError(null), [])
  const clearResults = useCallback(() => {
    setResults([])
    setLimit(AGENT_TYPEAHEAD_PAGE_SIZE)
  }, [])

  const search = useCallback(
    async (
      value: string,
      options?: {
        limit?: number
        isNextPage?: boolean
      },
    ) => {
      const normalizedQuery = value.trim()
      const nextLimit = options?.limit ?? AGENT_TYPEAHEAD_PAGE_SIZE
      const isNextPage = Boolean(options?.isNextPage)

      setQuery(normalizedQuery)

      requestRef.current += 1
      const requestId = requestRef.current

      if (normalizedQuery.length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
        setResults([])
        setError(null)
        setIsLoading(false)
        setIsFetchingNextPage(false)
        setLimit(AGENT_TYPEAHEAD_PAGE_SIZE)
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        setError(null)
        if (isNextPage) {
          setIsFetchingNextPage(true)
        } else {
          setIsLoading(true)
          setLimit(AGENT_TYPEAHEAD_PAGE_SIZE)
        }

        const nextResults = await searchAgentProfiles({
          query: normalizedQuery,
          limit: nextLimit,
          signal: controller.signal,
        })

        if (requestId === requestRef.current) {
          setResults(nextResults)
          setLimit(nextLimit)
        }
      } catch {
        if (requestId === requestRef.current) {
          if (!isNextPage) setResults([])
          setError(AGENT_SEARCH_ERROR)
        }
      } finally {
        if (requestId === requestRef.current) {
          abortRef.current = null
          setIsLoading(false)
          setIsFetchingNextPage(false)
        }
      }
    },
    [],
  )

  const fetchNextPage = useCallback(() => {
    if (isLoading || isFetchingNextPage) return
    if (results.length < limit) return
    void search(query, {
      limit: limit + AGENT_TYPEAHEAD_PAGE_SIZE,
      isNextPage: true,
    })
  }, [isFetchingNextPage, isLoading, limit, query, results.length, search])

  useEffect(() => cancelRequest, [cancelRequest])

  const hasNextPage = results.length > 0 && results.length >= limit

  return {
    query,
    results,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    setQuery,
    clearError,
    clearResults,
    cancelRequest,
    stopSearch,
    search,
    fetchNextPage,
  }
}
