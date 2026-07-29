import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  listingCollectionQueryKeys,
  optimisticallyDeleteListing,
  relatedListingQueryKeys,
  removeDeletedListingDetails,
} from "../utils/listingMutationCache"
import {
  deleteOwnerListing,
  isOwnerListingNotFoundError,
} from "./deleteOwnerListing"

async function deleteOwnerListingIdempotently(listingId: string) {
  try {
    return await deleteOwnerListing(listingId)
  } catch (error) {
    if (!isOwnerListingNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteOwnerListing() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteOwnerListingIdempotently>>,
    Error,
    string
  >({
    queryClient,
    // Every owner listing delete patches shared collections and pagination.
    // One scope prevents two deletes from snapshotting the same list at once.
    scopeKey: () => "listing:delete:owner",
    getPlan: listingId => ({
      cancel: relatedListingQueryKeys(listingId),
      snapshot: relatedListingQueryKeys(listingId),
      invalidate: listingCollectionQueryKeys,
    }),
    apply: ({ queryClient: client, variables: listingId }) => {
      optimisticallyDeleteListing(client, listingId)
    },
    reconcile: ({ queryClient: client, variables: listingId }) => {
      removeDeletedListingDetails(client, listingId)
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: "delete-owner-listing" },
    mutationFn: deleteOwnerListingIdempotently,
    ...transaction,
  })
}
