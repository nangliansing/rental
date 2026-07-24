import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelRelatedListingQueries,
  captureRelatedListingQueries,
  invalidateListingCollections,
  patchListingInRelatedQueries,
  restoreListingCacheSnapshot,
} from "../utils/listingMutationCache"
import {
  updateOwnerListing,
  type UpdateOwnerListingInput,
} from "./updateOwnerListing"

type UpdateOwnerListingVariables = {
  listingId: string
  values: UpdateOwnerListingInput
}

export function useUpdateOwnerListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, values }: UpdateOwnerListingVariables) =>
      updateOwnerListing(listingId, values),
    onMutate: async ({ listingId, values }) => {
      await cancelRelatedListingQueries(queryClient, listingId)
      const snapshot = captureRelatedListingQueries(queryClient, listingId)
      patchListingInRelatedQueries(queryClient, listingId, values)
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreListingCacheSnapshot(queryClient, context.snapshot)
      }
    },
    onSuccess: (updatedListing, { listingId }) => {
      patchListingInRelatedQueries(queryClient, listingId, updatedListing)
    },
    onSettled: async (updatedListing) => {
      if (!updatedListing) return
      await invalidateListingCollections(queryClient)
    },
  })
}
