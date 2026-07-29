import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  listingCollectionQueryKeys,
  patchListingInRelatedQueries,
  relatedListingQueryKeys,
} from "../utils/listingMutationCache"
import {
  updateOwnerListing,
  type UpdateOwnerListingInput,
  type UpdatedOwnerListing,
} from "./updateOwnerListing"

type UpdateOwnerListingVariables = {
  listingId: string
  values: UpdateOwnerListingInput
}

export function useUpdateOwnerListing() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    UpdatedOwnerListing,
    Error,
    UpdateOwnerListingVariables
  >({
    queryClient,
    scopeKey: ({ listingId }) => `listing:update:${listingId}`,
    getPlan: ({ listingId }) => ({
      cancel: relatedListingQueryKeys(listingId),
      snapshot: relatedListingQueryKeys(listingId),
      invalidate: listingCollectionQueryKeys,
    }),
    apply: ({ queryClient: client, variables }) => {
      patchListingInRelatedQueries(
        client,
        variables.listingId,
        variables.values,
      )
    },
    reconcile: ({ queryClient: client, variables, data }) => {
      patchListingInRelatedQueries(client, variables.listingId, data)
    },
    shouldInvalidate: ({ data, error }) =>
      error === null && data !== undefined,
  })

  return useMutation({
    mutationFn: ({ listingId, values }: UpdateOwnerListingVariables) =>
      updateOwnerListing(listingId, values),
    ...transaction,
  })
}
