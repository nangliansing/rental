import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import {
  OWNER_SAVED_SEARCH_WRITE_SCOPE_ID,
  createOptimisticDeletedSavedSearch,
  findOwnerSavedSearch,
  ownerSavedSearchCachePlan,
  readOwnerSavedSearchCache,
  removeOwnerSavedSearchFromLists,
  softDeleteOwnerSavedSearchCache,
} from "./savedSearchMutationCache"
import type { SavedSearch } from "./savedSearchParsers"
import {
  deleteOwnerSavedSearch,
  isOwnerSavedSearchNotFoundError,
  type DeleteOwnerSavedSearchInput,
  type DeletedOwnerSavedSearch,
} from "./deleteOwnerSavedSearch"

type OptimisticContext = {
  savedSearchId: string
}

function normalizeSavedSearchId(
  input: DeleteOwnerSavedSearchInput,
): string {
  return input.savedSearchId.trim()
}

async function deleteOwnerSavedSearchIdempotently(
  input: DeleteOwnerSavedSearchInput,
): Promise<DeletedOwnerSavedSearch | null> {
  try {
    return await deleteOwnerSavedSearch(input)
  } catch (error) {
    if (!isOwnerSavedSearchNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteOwnerSavedSearch() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    DeletedOwnerSavedSearch | null,
    Error,
    DeleteOwnerSavedSearchInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerSavedSearchCachePlan(normalizeSavedSearchId(variables)),
    scopeKey: variables =>
      `owner-saved-search:delete:${normalizeSavedSearchId(variables)}`,
    apply: ({ variables }) => {
      const savedSearchId = normalizeSavedSearchId(variables)
      const cache = readOwnerSavedSearchCache(queryClient, savedSearchId)
      const current = findOwnerSavedSearch(
        cache.detailData,
        cache.listData,
        savedSearchId,
      )

      removeOwnerSavedSearchFromLists(queryClient, savedSearchId)

      if (current) {
        queryClient.setQueryData(
          cache.detailKey,
          createOptimisticDeletedSavedSearch(current),
        )
      }

      return { savedSearchId }
    },
    reconcile: ({ data, optimisticContext }) => {
      const { savedSearchId } = optimisticContext

      if (data) {
        softDeleteOwnerSavedSearchCache(queryClient, savedSearchId, data)
        return
      }

      // Idempotent 404: keep lists clean; preserve an already-deleted detail mark.
      removeOwnerSavedSearchFromLists(queryClient, savedSearchId)
      const detailKey = queryKeys.savedSearches.ownerDetail(savedSearchId)
      const detail = queryClient.getQueryData<SavedSearch>(detailKey)
      if (detail && detail.isDeleted !== true) {
        queryClient.setQueryData(
          detailKey,
          createOptimisticDeletedSavedSearch(detail),
        )
      }
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: OWNER_SAVED_SEARCH_WRITE_SCOPE_ID },
    mutationFn: deleteOwnerSavedSearchIdempotently,
    ...transaction,
  })
}
