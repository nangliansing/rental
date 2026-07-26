import { Grid3X3, Star } from "lucide-react"

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

const SORT_OPTIONS: {
  id: SearchListingsByAgentSort
  label: string
}[] = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
]

export function ListerProfileTabs({
  activeTab,
  activeSort,
  onTabChange,
  onSortChange,
}: {
  activeTab: ListerProfileMainTab
  activeSort: SearchListingsByAgentSort
  onTabChange: (tab: ListerProfileMainTab) => void
  onSortChange: (sort: SearchListingsByAgentSort) => void
}) {
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
            options={SORT_OPTIONS}
            value={activeSort}
            aria-label="Listing sort"
            onChange={onSortChange}
          />
        </div>
      )}
    </>
  )
}
