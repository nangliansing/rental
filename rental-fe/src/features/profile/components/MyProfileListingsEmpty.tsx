import { Grid3X3 } from "lucide-react"

import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

import { MyProfileEmptyState } from "./MyProfileEmptyState"
import type { MyProfileListingFilter } from "./MyProfileListingTabs"

const LISTING_EMPTY_COPY: Record<
    MyProfileListingFilter,
    {
        title: string
        description: string
        action?: {
            label: string
            href: string
        }
    }
> = {
    all: {
        title: "No listings yet",
        description:
            "Approved listings appear here after review. Start from the map to submit your first room.",
        action: {
            label: "Start listing",
            href: MAP_SEARCH_LIST_ROOM_PATH,
        },
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
            action={copy.action}
        />
    )
}
