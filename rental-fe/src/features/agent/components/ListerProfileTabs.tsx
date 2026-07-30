import { ArrowDownUp, ChevronDown, Grid3X3, Star } from "lucide-react"

import type { ListingAvailabilityFilter } from "@/features/agent/api"
import { ProfileSectionTab } from "@/features/profile/components/ProfileSectionTab"
import {
  PROFILE_SECTION_TABLIST_2_CLASS,
  PROFILE_TAB_CONTROLS_CLASS,
} from "@/features/profile/utils/profileLayoutStyles"
import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import type { SearchListingsByAgentSort } from "../api"

export type ListerProfileMainTab = "listings" | "reviews"

const LISTER_TABS = [
  { id: "listings" as const, label: "Listings", icon: Grid3X3 },
  { id: "reviews" as const, label: "Reviews", icon: Star },
]

const LISTING_FILTERS: {
  id: ListingAvailabilityFilter
  label: string
}[] = [
  { id: "all", label: "All" },
  { id: "now", label: "Now" },
  { id: "soon", label: "Soon" },
]

const SORT_OPTIONS: {
  id: SearchListingsByAgentSort
  label: string
}[] = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
]

export function ListerProfileTabs({
  activeTab,
  activeFilter,
  activeSort,
  onTabChange,
  onFilterChange,
  onSortChange,
}: {
  activeTab: ListerProfileMainTab
  activeFilter: ListingAvailabilityFilter
  activeSort: SearchListingsByAgentSort
  onTabChange: (tab: ListerProfileMainTab) => void
  onFilterChange: (filter: ListingAvailabilityFilter) => void
  onSortChange: (sort: SearchListingsByAgentSort) => void
}) {
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.id === activeSort)?.label ?? "Latest"
  const showsAvailabilitySortHint = activeFilter === "soon"

  return (
    <>
      <div
        className={PROFILE_SECTION_TABLIST_2_CLASS}
        role="tablist"
        aria-label="Lister profile sections"
      >
        {LISTER_TABS.map((tab) => (
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
              htmlFor="lister-profile-listing-sort"
              className="relative inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            >
              <ArrowDownUp className="h-4 w-4" />
              <span>{activeSortLabel}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />

              <span className="sr-only">Sort listings</span>
              <span className="absolute inset-0">
                <select
                  id="lister-profile-listing-sort"
                  value={activeSort}
                  className="h-full w-full cursor-pointer appearance-none opacity-0"
                  onChange={(event) => {
                    const nextSort = event.target.value
                    if (nextSort === "latest" || nextSort === "oldest") {
                      onSortChange(nextSort)
                    }
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          )}
        </div>
      )}
    </>
  )
}
