import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  deleteSavedListing,
  isSavedListingNotFoundError,
} from "../api"
import {
  applyDeletedSavedListingToCache,
  relatedSavedListingQueryKeys,
  SAVED_LISTING_WRITE_SCOPE_ID,
} from "../utils/savedListingCache"

type DeleteSavedListingVariables = {
  listingId: string
}

async function deleteSavedListingIdempotently({
  listingId,
}: DeleteSavedListingVariables) {
  try {
    return await deleteSavedListing({ listingId })
  } catch (error) {
    if (!isSavedListingNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteSavedListing() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteSavedListingIdempotently>>,
    Error,
    DeleteSavedListingVariables
  >({
    queryClient,
    // All removals share saved-list collection totals.
    scopeKey: () => SAVED_LISTING_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: relatedSavedListingQueryKeys,
      snapshot: relatedSavedListingQueryKeys,
    }),
    apply: ({ queryClient: client, variables: { listingId } }) => {
      applyDeletedSavedListingToCache(client, listingId)
    },
    reconcile: ({ queryClient: client, variables: { listingId } }) => {
      // Defend against a refetch or cache write that completed while pending.
      applyDeletedSavedListingToCache(client, listingId)
    },
    shouldInvalidate: () => false,
  })

  return useMutation({
    scope: { id: SAVED_LISTING_WRITE_SCOPE_ID },
    mutationFn: deleteSavedListingIdempotently,
    ...transaction,
  })
}
