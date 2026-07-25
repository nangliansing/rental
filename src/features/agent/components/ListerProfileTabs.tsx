import type { ComponentType } from "react"
import { Grid3X3, Star } from "lucide-react"

import { cn } from "@/lib/utils"
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
    <div>
      <div className="flex flex-col md:flex-row md:items-end">
        <div
          className="flex min-w-0 flex-1"
          role="tablist"
          aria-label="Lister profile sections"
        >
          {LISTER_TABS.map((tab) => (
            <ListerProfileTab
              key={tab.id}
              isActive={tab.id === activeTab}
              icon={tab.icon}
              label={tab.label}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>

        {activeTab === "listings" && (
          <div className="flex justify-center px-2 py-3 md:justify-end md:px-0 md:pb-2 md:pt-0">
            <ListingSortControl
              activeSort={activeSort}
              onSortChange={onSortChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ListerProfileTab({
  isActive = false,
  icon: Icon,
  label,
  onClick,
}: {
  isActive?: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={cn(
        "flex h-12 flex-1 items-center justify-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition sm:gap-2 sm:px-4",
        isActive
          ? "border-slate-950 text-slate-950"
          : "border-transparent text-slate-500 hover:text-slate-800",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
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
    <SegmentedTabs
      options={SORT_OPTIONS}
      value={activeSort}
      aria-label="Listing sort"
      className="rounded-full bg-slate-100 p-1"
      tabClassName="h-8 rounded-full px-3 text-xs"
      onChange={onSortChange}
    />
  )
}
