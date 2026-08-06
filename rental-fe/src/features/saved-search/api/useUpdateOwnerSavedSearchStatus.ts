import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  OWNER_SAVED_SEARCH_WRITE_SCOPE_ID,
  createOptimisticClosedSavedSearch,
  findOwnerSavedSearch,
  ownerSavedSearchCachePlan,
  readOwnerSavedSearchCache,
  updateOwnerSavedSearchCache,
} from "./savedSearchMutationCache"
import {
  updateOwnerSavedSearchStatus,
  type UpdateOwnerSavedSearchStatusInput,
} from "./updateOwnerSavedSearchStatus"
import type { SavedSearch } from "./savedSearchParsers"

type OptimisticContext = {
  savedSearchId: string
}

function normalizeSavedSearchId(
  input: UpdateOwnerSavedSearchStatusInput,
): string {
  return input.savedSearchId.trim()
}

export function useUpdateOwnerSavedSearchStatus() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    SavedSearch,
    Error,
    UpdateOwnerSavedSearchStatusInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerSavedSearchCachePlan(normalizeSavedSearchId(variables)),
    scopeKey: variables =>
      `owner-saved-search:status:${normalizeSavedSearchId(variables)}`,
    apply: ({ variables }) => {
      const savedSearchId = normalizeSavedSearchId(variables)
      const cache = readOwnerSavedSearchCache(queryClient, savedSearchId)
      const current = findOwnerSavedSearch(
        cache.detailData,
        cache.listData,
        savedSearchId,
      )

      if (current) {
        updateOwnerSavedSearchCache(
          queryClient,
          cache,
          createOptimisticClosedSavedSearch(current),
        )
      }

      return { savedSearchId }
    },
    reconcile: ({ data, optimisticContext }) => {
      updateOwnerSavedSearchCache(
        queryClient,
        readOwnerSavedSearchCache(
          queryClient,
          optimisticContext.savedSearchId,
        ),
        data,
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: OWNER_SAVED_SEARCH_WRITE_SCOPE_ID },
    mutationFn: updateOwnerSavedSearchStatus,
    ...transaction,
  })
}
