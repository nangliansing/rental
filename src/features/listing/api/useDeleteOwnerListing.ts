import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelRelatedListingQueries,
  captureRelatedListingQueries,
  invalidateListingCollections,
  optimisticallyDeleteListing,
  removeDeletedListingDetails,
  restoreListingCacheSnapshot,
} from "../utils/listingMutationCache"
import {
  deleteOwnerListing,
  isOwnerListingNotFoundError,
} from "./deleteOwnerListing"

export function useDeleteOwnerListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listingId: string) => {
      try {
        return await deleteOwnerListing(listingId)
      } catch (error) {
        if (!isOwnerListingNotFoundError(error)) throw error
        return null
      }
    },
    onMutate: async (listingId) => {
      await cancelRelatedListingQueries(queryClient, listingId)
      const snapshot = captureRelatedListingQueries(queryClient, listingId)
      optimisticallyDeleteListing(queryClient, listingId)
      return { snapshot }
    },
    onError: (_error, _listingId, context) => {
      if (context?.snapshot) {
        restoreListingCacheSnapshot(queryClient, context.snapshot)
      }
    },
    onSuccess: (_deletedListing, listingId) => {
      removeDeletedListingDetails(queryClient, listingId)
    },
    onSettled: async (_data, error) => {
      if (error) return
      await invalidateListingCollections(queryClient)
    },
  })
}
