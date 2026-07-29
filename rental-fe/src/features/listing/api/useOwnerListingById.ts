import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getOwnerListingById } from "./getOwnerListingById"

export const ownerListingQueryKey = (listingId: string | undefined) =>
  queryKeys.listings.ownerDetail(listingId)

export const ownerListingQueryOptions = (
  listingId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: ownerListingQueryKey(listingId),
    enabled: enabled && Boolean(listingId?.trim()),
    queryFn: ({ signal }) => getOwnerListingById(listingId ?? "", signal),
  })

type UseOwnerListingByIdInput = {
  listingId?: string
  enabled?: boolean
}

export function useOwnerListingById({
  listingId,
  enabled = true,
}: UseOwnerListingByIdInput) {
  return useQuery(ownerListingQueryOptions(listingId, enabled))
}
