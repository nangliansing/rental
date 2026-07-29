import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getPublicListingById } from "./getPublicListingById"

export const publicListingQueryKey = (
  listingId: string | undefined,
  viewerKey?: string | null,
) => queryKeys.listings.publicDetail(listingId, viewerKey)

export const publicListingQueryOptions = ({
  listingId,
  viewerKey = null,
  enabled = true,
}: UsePublicListingByIdInput) => {
  const normalizedListingId = listingId?.trim() || undefined

  return queryOptions({
    queryKey: publicListingQueryKey(normalizedListingId, viewerKey),
    enabled: enabled && Boolean(normalizedListingId),
    queryFn: ({ signal }) =>
      getPublicListingById(normalizedListingId ?? "", signal),
  })
}

type UsePublicListingByIdInput = {
  listingId?: string
  viewerKey?: string | null
  enabled?: boolean
}

export function usePublicListingById({
  listingId,
  viewerKey = null,
  enabled = true,
}: UsePublicListingByIdInput) {
  return useQuery(
    publicListingQueryOptions({ listingId, viewerKey, enabled }),
  )
}
