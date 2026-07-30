import { Grid3X3 } from "lucide-react"

import type { OwnerListingFilter } from "@/features/listing/api"
import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

import { MyProfileEmptyState } from "./MyProfileEmptyState"

const LISTING_EMPTY_COPY: Record<
    OwnerListingFilter,
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
    now: {
        title: "No listings available now",
        description:
            "Public listings available today or earlier will appear here.",
    },
    soon: {
        title: "No upcoming listings",
        description:
            "Public listings with a future availability date will appear here.",
    },
    private: {
        title: "No private listings",
        description: "Listings hidden from renters will appear here.",
    },
}

export function MyProfileListingsEmpty({
    filter,
}: {
    filter: OwnerListingFilter
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
