import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  OWNER_SAVED_SEARCH_WRITE_SCOPE_ID,
  createOptimisticUpdatedSavedSearch,
  findOwnerSavedSearch,
  ownerSavedSearchCachePlan,
  readOwnerSavedSearchCache,
  updateOwnerSavedSearchCache,
} from "./savedSearchMutationCache"
import type { SavedSearch } from "./savedSearchParsers"
import {
  updateOwnerSavedSearch,
  type UpdateOwnerSavedSearchInput,
} from "./updateOwnerSavedSearch"

type OptimisticContext = {
  savedSearchId: string
}

function normalizeSavedSearchId(
  input: UpdateOwnerSavedSearchInput,
): string {
  return input.savedSearchId.trim()
}

export function useUpdateOwnerSavedSearch() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    SavedSearch,
    Error,
    UpdateOwnerSavedSearchInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerSavedSearchCachePlan(normalizeSavedSearchId(variables)),
    scopeKey: variables =>
      `owner-saved-search:update:${normalizeSavedSearchId(variables)}`,
    apply: ({ variables }) => {
      const savedSearchId = normalizeSavedSearchId(variables)
      const cache = readOwnerSavedSearchCache(queryClient, savedSearchId)
      const current = findOwnerSavedSearch(
        cache.detailData,
        cache.listData,
        savedSearchId,
      )

      if (current) {
        const { savedSearchId: _id, ...patch } = variables
        updateOwnerSavedSearchCache(
          queryClient,
          cache,
          createOptimisticUpdatedSavedSearch(current, patch),
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
    mutationFn: updateOwnerSavedSearch,
    ...transaction,
  })
}
