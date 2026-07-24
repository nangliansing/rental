import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getOwnerListingById } from "./getOwnerListingById"

export const ownerListingQueryKey = (listingId: string | undefined) =>
  queryKeys.listings.ownerDetail(listingId)

type UseOwnerListingByIdInput = {
  listingId?: string
  enabled?: boolean
}

export function useOwnerListingById({
  listingId,
  enabled = true,
}: UseOwnerListingByIdInput) {
  return useQuery({
    queryKey: ownerListingQueryKey(listingId),
    enabled: enabled && Boolean(listingId),
    queryFn: () => getOwnerListingById(listingId!),
  })
}
