import { useMemo, useState } from "react"

import {
    useSearchOwnerListings,
    type OwnerListingFilter,
    type OwnerListingSort,
} from "@/features/listing/api"
import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
import {
    ListingGridPreviewPortal,
    useListingGridPreview,
} from "@/features/listing/components/grid-preview"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
    ListingCollectionMessage,
    ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { PROFILE_TAB_CONTENT_TOP_CLASS } from "../utils/profileLayoutStyles"
import { MyProfileListingsEmpty } from "./MyProfileListingsEmpty"
import { ProfileTabPanel } from "./ProfileTabPanel"

type MyProfileListingsPanelProps = {
    filter: OwnerListingFilter
    sort: OwnerListingSort
}

export function MyProfileListingsPanel({
    filter,
    sort,
}: MyProfileListingsPanelProps) {
    const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
    const preview = useListingGridPreview()
    const listingsQuery = useSearchOwnerListings({
        filter,
        sort,
    })

    const listings = useMemo(() => {
        return flattenUniqueInfiniteItems({
            data: listingsQuery.data,
            getItems: (page) => {
                const listings = page.data?.listings ?? []

                return listings.map((listing) => ({
                    ...listing,
                    agentProfile:
                        listing.agentProfile ?? page.data?.agentProfile ?? null,
                }))
            },
            getKey: (listing) => listing._id,
        })
    }, [listingsQuery.data])

    if (listingsQuery.isLoading) {
        return <ListingCollectionSkeleton className={PROFILE_TAB_CONTENT_TOP_CLASS} />
    }

    if (listingsQuery.isError) {
        return (
            <ListingCollectionMessage
                className={PROFILE_TAB_CONTENT_TOP_CLASS}
                title="Could not load listings"
                description="Please try again in a moment."
                onRetry={() => void listingsQuery.refetch()}
            />
        )
    }

    if (listings.length === 0) {
        return <MyProfileListingsEmpty filter={filter} />
    }

    return (
        <ProfileTabPanel>
            <ListingCardGrid
                hasNextPage={Boolean(listingsQuery.hasNextPage)}
                isFetchingNextPage={listingsQuery.isFetchingNextPage}
                isFetchNextPageError={listingsQuery.isFetchNextPageError}
                onFetchNextPage={() => void listingsQuery.fetchNextPage()}
                endMessage="No more listings"
            >
                {listings.map((listing) => (
                    <ListingGridCard
                        key={listing._id}
                        listing={listing}
                        onActivate={preview.openPreview}
                    />
                ))}
            </ListingCardGrid>

            <ListingGridPreviewPortal
                preview={preview}
                onOpenDetail={setSelectedListingId}
            />

            <ListingDetailModal
                listingId={selectedListingId}
                onClose={() => setSelectedListingId(null)}
                onListingSelect={setSelectedListingId}
            />
        </ProfileTabPanel>
    )
}
