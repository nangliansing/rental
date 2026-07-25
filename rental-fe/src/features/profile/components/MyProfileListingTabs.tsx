import type { ComponentType } from "react"
import {
    ArrowDownUp,
    ChevronDown,
    Clock3,
    Grid3X3,
    Heart,
    Star,
} from "lucide-react"

import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import { ProfileSectionTab } from "./ProfileSectionTab"

export type MyProfileMainTab = "listings" | "pending" | "saved" | "reviews"
export type MyProfileListingFilter = "all" | "available" | "unavailable"
export type MyProfileListingSort = "latest" | "oldest"
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
    id: MyProfileListingFilter
    label: string
}[] = [
    {
        id: "all",
        label: "All",
    },
    {
        id: "available",
        label: "Available",
    },
    {
        id: "unavailable",
        label: "Unavailable",
    },
]

const LISTING_SORT_OPTIONS: {
    id: MyProfileListingSort
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
    activeListingFilter: MyProfileListingFilter
    activeListingSort: MyProfileListingSort
    activePendingFilter: MyProfilePendingFilter
    onTabChange: (tab: MyProfileMainTab) => void
    onListingFilterChange: (filter: MyProfileListingFilter) => void
    onListingSortChange: (sort: MyProfileListingSort) => void
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
                className="grid grid-cols-4 border-b border-slate-200 text-slate-500"
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
    activeFilter: MyProfileListingFilter
    activeSort: MyProfileListingSort
    onFilterChange: (filter: MyProfileListingFilter) => void
    onSortChange: (sort: MyProfileListingSort) => void
}) {
    const activeSortLabel =
        LISTING_SORT_OPTIONS.find((option) => option.id === activeSort)?.label ??
        "Latest"

    return (
        <div className="mt-7 flex flex-col items-center gap-3 md:flex-row md:justify-between">
            <SegmentedTabs
                options={LISTING_FILTERS}
                value={activeFilter}
                aria-label="Listing availability"
                onChange={onFilterChange}
            />

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
                            onSortChange(event.target.value as MyProfileListingSort)
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
        <div className="mt-7 flex justify-center">
            <SegmentedTabs
                options={PENDING_FILTERS}
                value={activeFilter}
                aria-label="Pending listing status"
                onChange={onFilterChange}
            />
        </div>
    )
}
