import type { ComponentType } from "react"
import { Grid3X3, Star } from "lucide-react"

import { ProfileSectionTab } from "@/features/profile/components/ProfileSectionTab"
import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import type { SearchListingsByAgentSort } from "../api"

export type ListerProfileMainTab = "listings" | "reviews"

const LISTER_TABS: {
  id: ListerProfileMainTab
  label: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { id: "listings", label: "Listings", icon: Grid3X3 },
  { id: "reviews", label: "Reviews", icon: Star },
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
        className="grid grid-cols-2 border-b border-slate-200 text-slate-500"
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
        <ListingSortControl activeSort={activeSort} onSortChange={onSortChange} />
      )}
    </>
  )
}

function ListingSortControl({
  activeSort,
  onSortChange,
}: {
  activeSort: SearchListingsByAgentSort
  onSortChange: (sort: SearchListingsByAgentSort) => void
}) {
  return (
    <div className="flex justify-center py-4 md:justify-start">
      <SegmentedTabs
        options={SORT_OPTIONS}
        value={activeSort}
        aria-label="Listing sort"
        onChange={onSortChange}
      />
    </div>
  )
}
