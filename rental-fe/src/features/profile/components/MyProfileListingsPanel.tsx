import { useMemo, useState } from "react"

import {
    useSearchOwnerListings,
    type OwnerListing,
    type OwnerListingSort,
    type OwnerListingVisibilityFilter,
} from "@/features/listing/api"
import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
    ListingCollectionMessage,
    ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { PROFILE_TAB_CONTENT_TOP_CLASS } from "../utils/profileLayoutStyles"
import { MyProfileListingsEmpty } from "./MyProfileListingsEmpty"
import type {
    MyProfileListingFilter,
    MyProfileListingSort,
} from "./MyProfileListingTabs"
import { ProfileTabPanel } from "./ProfileTabPanel"

type MyProfileListingsPanelProps = {
    filter: MyProfileListingFilter
    sort: MyProfileListingSort
}

const VISIBILITY_FILTER_BY_PROFILE_FILTER: Record<
    MyProfileListingFilter,
    OwnerListingVisibilityFilter
> = {
    all: "all",
    available: "public",
    unavailable: "private",
}

const OWNER_SORT_BY_PROFILE_SORT: Record<
    MyProfileListingSort,
    OwnerListingSort
> = {
    latest: "latest",
    oldest: "oldest",
}

export function MyProfileListingsPanel({
    filter,
    sort,
}: MyProfileListingsPanelProps) {
    const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
    const listingsQuery = useSearchOwnerListings({
        visibility: VISIBILITY_FILTER_BY_PROFILE_FILTER[filter],
        sort: OWNER_SORT_BY_PROFILE_SORT[sort],
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
                    <MyProfileListingGridItem
                        key={listing._id}
                        listing={listing}
                        onOpen={setSelectedListingId}
                    />
                ))}
            </ListingCardGrid>

            <ListingDetailModal
                listingId={selectedListingId}
                onClose={() => setSelectedListingId(null)}
                onListingSelect={setSelectedListingId}
            />
        </ProfileTabPanel>
    )
}

function MyProfileListingGridItem({
    listing,
    onOpen,
}: {
    listing: OwnerListing
    onOpen: (listingId: string) => void
}) {
    return <ListingGridCard listing={listing} onOpen={onOpen} />
}
