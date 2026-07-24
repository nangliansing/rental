import { useCallback, useEffect, useRef, useState } from "react"

import {
  searchAgentProfiles,
  type SearchAgentProfile,
} from "@/features/agent"

import { MIN_SEARCH_QUERY_LENGTH } from "../components/place-search/search.constants"

const AGENT_SEARCH_ERROR = "Agent search is unavailable. Try again."

export function useAgentTypeahead() {
  const requestRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchAgentProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const cancelRequest = useCallback(() => {
    requestRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const stopSearch = useCallback(() => {
    cancelRequest()
    setIsLoading(false)
  }, [cancelRequest])

  const clearError = useCallback(() => setError(null), [])
  const clearResults = useCallback(() => setResults([]), [])

  const search = useCallback(async (value: string) => {
    const normalizedQuery = value.trim()
    setQuery(normalizedQuery)

    requestRef.current += 1
    const requestId = requestRef.current

    if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setResults([])
      setError(null)
      setIsLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setError(null)
      setIsLoading(true)
      const nextResults = await searchAgentProfiles({
        query: normalizedQuery,
        limit: 10,
        signal: controller.signal,
      })

      if (requestId === requestRef.current) setResults(nextResults)
    } catch {
      if (requestId === requestRef.current) {
        setResults([])
        setError(AGENT_SEARCH_ERROR)
      }
    } finally {
      if (requestId === requestRef.current) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => cancelRequest, [cancelRequest])

  return {
    query,
    results,
    error,
    isLoading,
    setQuery,
    clearError,
    clearResults,
    cancelRequest,
    stopSearch,
    search,
  }
}
