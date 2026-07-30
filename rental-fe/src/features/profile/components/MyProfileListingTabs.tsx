import type { ComponentType } from "react"
import {
    ArrowDownUp,
    ChevronDown,
    Clock3,
    Grid3X3,
    Heart,
    Star,
} from "lucide-react"

import type {
    OwnerListingFilter,
    OwnerListingSort,
} from "@/features/listing/api"
import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import { ProfileSectionTab } from "./ProfileSectionTab"
import {
  PROFILE_SECTION_TABLIST_4_CLASS,
  PROFILE_TAB_CONTROLS_CENTERED_CLASS,
  PROFILE_TAB_CONTROLS_CLASS,
} from "../utils/profileLayoutStyles"

export type MyProfileMainTab = "listings" | "pending" | "saved" | "reviews"
export type MyProfilePendingFilter =
    | "all"
    | "pending"
    | "approved"
    | "rejected"

type ProfileTabConfig = {
    id: MyProfileMainTab
    label: string
    icon: ComponentType<{ className?: string }>
}

const PROFILE_TABS: ProfileTabConfig[] = [
    {
        id: "listings",
        label: "Listings",
        icon: Grid3X3,
    },
    {
        id: "pending",
        label: "Pending",
        icon: Clock3,
    },
    {
        id: "saved",
        label: "Saved",
        icon: Heart,
    },
    {
        id: "reviews",
        label: "Reviews",
        icon: Star,
    },
]

const LISTING_FILTERS: {
    id: OwnerListingFilter
    label: string
}[] = [
    {
        id: "all",
        label: "All",
    },
    {
        id: "now",
        label: "Now",
    },
    {
        id: "soon",
        label: "Soon",
    },
    {
        id: "private",
        label: "Private",
    },
]

const LISTING_SORT_OPTIONS: {
    id: OwnerListingSort
    label: string
}[] = [
    {
        id: "latest",
        label: "Latest",
    },
    {
        id: "oldest",
        label: "Oldest",
    },
]

const PENDING_FILTERS: {
    id: MyProfilePendingFilter
    label: string
}[] = [
    {
        id: "all",
        label: "All",
    },
    {
        id: "pending",
        label: "Pending",
    },
    {
        id: "approved",
        label: "Approved",
    },
    {
        id: "rejected",
        label: "Rejected",
    },
]

type MyProfileListingTabsProps = {
    activeTab: MyProfileMainTab
    activeListingFilter: OwnerListingFilter
    activeListingSort: OwnerListingSort
    activePendingFilter: MyProfilePendingFilter
    onTabChange: (tab: MyProfileMainTab) => void
    onListingFilterChange: (filter: OwnerListingFilter) => void
    onListingSortChange: (sort: OwnerListingSort) => void
    onPendingFilterChange: (filter: MyProfilePendingFilter) => void
}

export function MyProfileListingTabs({
    activeTab,
    activeListingFilter,
    activeListingSort,
    activePendingFilter,
    onTabChange,
    onListingFilterChange,
    onListingSortChange,
    onPendingFilterChange,
}: MyProfileListingTabsProps) {
    return (
        <>
            <div
                className={PROFILE_SECTION_TABLIST_4_CLASS}
                role="tablist"
                aria-label="Profile sections"
            >
                {PROFILE_TABS.map((tab) => (
                    <ProfileSectionTab
                        key={tab.id}
                        isActive={tab.id === activeTab}
                        icon={tab.icon}
                        label={tab.label}
                        onClick={() => onTabChange(tab.id)}
                    />
                ))}
            </div>

            {activeTab === "listings" && (
                <ListingTabControls
                    activeFilter={activeListingFilter}
                    activeSort={activeListingSort}
                    onFilterChange={onListingFilterChange}
                    onSortChange={onListingSortChange}
                />
            )}

            {activeTab === "pending" && (
                <PendingTabControls
                    activeFilter={activePendingFilter}
                    onFilterChange={onPendingFilterChange}
                />
            )}
        </>
    )
}

function ListingTabControls({
    activeFilter,
    activeSort,
    onFilterChange,
    onSortChange,
}: {
    activeFilter: OwnerListingFilter
    activeSort: OwnerListingSort
    onFilterChange: (filter: OwnerListingFilter) => void
    onSortChange: (sort: OwnerListingSort) => void
}) {
    const activeSortLabel =
        LISTING_SORT_OPTIONS.find((option) => option.id === activeSort)?.label ??
        "Latest"
    const showsAvailabilitySortHint = activeFilter === "soon"

    return (
        <div className={PROFILE_TAB_CONTROLS_CLASS}>
            <SegmentedTabs
                options={LISTING_FILTERS}
                value={activeFilter}
                aria-label="Listing filters"
                onChange={onFilterChange}
            />

            {showsAvailabilitySortHint ? (
                <p
                    className="inline-flex h-9 items-center gap-2 px-2 text-sm font-semibold text-slate-500"
                    aria-label="Sorted by soonest availability"
                >
                    <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                    <span>Soonest first</span>
                </p>
            ) : (
                <label
                    htmlFor="my-profile-listing-sort"
                    className="relative inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                >
                    <ArrowDownUp className="h-4 w-4" />
                    <span>{activeSortLabel}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />

                    <span className="sr-only">Sort listings</span>
                    <span className="absolute inset-0">
                        <select
                            id="my-profile-listing-sort"
                            value={activeSort}
                            className="h-full w-full cursor-pointer appearance-none opacity-0"
                            onChange={(event) => {
                                const nextSort = event.target.value
                                if (
                                    nextSort === "latest" ||
                                    nextSort === "oldest"
                                ) {
                                    onSortChange(nextSort)
                                }
                            }}
                        >
                            {LISTING_SORT_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </span>
                </label>
            )}
        </div>
    )
}

function PendingTabControls({
    activeFilter,
    onFilterChange,
}: {
    activeFilter: MyProfilePendingFilter
    onFilterChange: (filter: MyProfilePendingFilter) => void
}) {
    return (
        <div className={PROFILE_TAB_CONTROLS_CENTERED_CLASS}>
            <SegmentedTabs
                options={PENDING_FILTERS}
                value={activeFilter}
                aria-label="Pending listing status"
                onChange={onFilterChange}
            />
        </div>
    )
}
