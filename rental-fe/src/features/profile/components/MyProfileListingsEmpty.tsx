import { Grid3X3 } from "lucide-react"

import { MyProfileEmptyState } from "./MyProfileEmptyState"
import type { MyProfileListingFilter } from "./MyProfileListingTabs"

const LISTING_EMPTY_COPY: Record<
    MyProfileListingFilter,
    {
        title: string
        description: string
    }
> = {
    all: {
        title: "No listings yet",
        description: "Your approved listings will appear here in a profile grid.",
    },
    available: {
        title: "No available listings",
        description: "Listings visible to renters will appear here.",
    },
    unavailable: {
        title: "No unavailable listings",
        description: "Private listings hidden from renters will appear here.",
    },
}

export function MyProfileListingsEmpty({
    filter,
}: {
    filter: MyProfileListingFilter
}) {
    const copy = LISTING_EMPTY_COPY[filter]

    return (
        <MyProfileEmptyState
            icon={Grid3X3}
            title={copy.title}
            description={copy.description}
        />
    )
}
