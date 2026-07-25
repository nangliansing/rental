import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelQueriesByKey,
  captureQueriesByKey,
  restoreQueryCacheSnapshot,
} from "@/lib/query-cache-snapshot"

import {
  deleteSavedListing,
  isSavedListingNotFoundError,
} from "../api"
import {
  applyDeletedSavedListingToCache,
  relatedSavedListingQueryKeys,
} from "../utils/savedListingCache"

type DeleteSavedListingVariables = {
  listingId: string
}

export function useDeleteSavedListing() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-saved-listing" },
    mutationFn: async ({ listingId }: DeleteSavedListingVariables) => {
      try {
        return await deleteSavedListing({ listingId })
      } catch (error) {
        if (!isSavedListingNotFoundError(error)) throw error
        return null
      }
    },
    onMutate: async ({ listingId }) => {
      await cancelQueriesByKey(queryClient, relatedSavedListingQueryKeys)
      const snapshots = captureQueriesByKey(
        queryClient,
        relatedSavedListingQueryKeys,
      )
      applyDeletedSavedListingToCache(queryClient, listingId)
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreQueryCacheSnapshot(queryClient, context.snapshots)
    },
    onSuccess: (_result, { listingId }) => {
      applyDeletedSavedListingToCache(queryClient, listingId)
    },
  })
}
