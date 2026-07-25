import { useAuth } from "@/features/auth/hooks/useAuth"
import type { SearchListing } from "@/features/map-search/types"

import { useOwnerListingById, usePublicListingById } from "../api"

type UseListingDetailDataOptions = {
  listingId: string | null | undefined
}

export type ListingDetailDataState = {
  listing: SearchListing | null
  isLoading: boolean
  viewerUserId: string | undefined
}

function mergeOwnerListing(
  ownerPayload: NonNullable<ReturnType<typeof useOwnerListingById>["data"]>,
): SearchListing {
  return {
    ...ownerPayload.listing,
    agentProfile:
      ownerPayload.listing.agentProfile ?? ownerPayload.agentProfile,
  }
}

export function useListingDetailData({
  listingId,
}: UseListingDetailDataOptions): ListingDetailDataState {
  const { user, isLoading: isAuthLoading } = useAuth()
  const publicListingQuery = usePublicListingById({
    listingId: listingId ?? undefined,
    viewerKey: user?._id ?? null,
    enabled: Boolean(listingId) && !isAuthLoading,
  })
  const ownerListingQuery = useOwnerListingById({
    listingId: listingId ?? undefined,
    enabled:
      Boolean(listingId) &&
      !isAuthLoading &&
      Boolean(user) &&
      publicListingQuery.isError,
  })

  const isLoading =
    publicListingQuery.isLoading ||
    (publicListingQuery.isError && isAuthLoading) ||
    ownerListingQuery.isLoading

  const listing = publicListingQuery.data
    ? publicListingQuery.data
    : ownerListingQuery.data
      ? mergeOwnerListing(ownerListingQuery.data)
      : null

  return {
    listing,
    isLoading,
    viewerUserId: user?._id,
  }
}
