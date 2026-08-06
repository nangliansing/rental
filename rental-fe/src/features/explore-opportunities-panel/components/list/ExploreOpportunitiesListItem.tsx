import { memo } from "react"
import { Radar } from "lucide-react"

import { MatchingBuildingCountChips } from "@/features/saved-search/components/MatchingBuildingCountChips"
import { cn } from "@/lib/utils"

import { useExploreOpportunitiesSelection } from "../../context/ExploreOpportunitiesSelectionContext"
import type { OpportunityListCue } from "../../utils/formatOpportunityListMeta"
import { ExploreOpportunitiesListCues } from "./ExploreOpportunitiesListCues"
import { ExploreOpportunitiesMatchingNote } from "./ExploreOpportunitiesMatchingNote"

type ExploreOpportunitiesListItemProps = {
  id: string
  title: string
  cues: OpportunityListCue[]
  moveInLabel: string | null
  timestamp: string
  myMatchingBuildingCount: number | null
  platformMatchingBuildingCount: number | null
  matchingBuildingCountCapped: boolean
  selected: boolean
  onSelect: (id: string) => void
}

function ExploreOpportunitiesListItemComponent({
  id,
  title,
  cues,
  moveInLabel,
  timestamp,
  myMatchingBuildingCount,
  platformMatchingBuildingCount,
  matchingBuildingCountCapped,
  selected,
  onSelect,
}: ExploreOpportunitiesListItemProps) {
  const { matchTab } = useExploreOpportunitiesSelection()
  const isMatchedTab = matchTab === "matched"

  return (
    <button
      type="button"
      className={cn(
        "grid w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3 px-3 py-3 text-left transition-colors",
        selected ? "bg-slate-100" : "bg-white hover:bg-slate-50",
      )}
      aria-selected={selected}
      onClick={() => onSelect(id)}
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-black/5"
        aria-hidden="true"
      >
        <Radar className="h-4 w-4" strokeWidth={2.25} />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950">
          {title}
        </span>
        <ExploreOpportunitiesListCues cues={cues} />
        {moveInLabel ? (
          <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
            {moveInLabel}
          </span>
        ) : null}
        {isMatchedTab ? (
          <ExploreOpportunitiesMatchingNote
            myMatchingBuildingCount={myMatchingBuildingCount}
            matchingBuildingCountCapped={matchingBuildingCountCapped}
          />
        ) : (
          <MatchingBuildingCountChips
            myMatchingBuildingCount={myMatchingBuildingCount}
            platformMatchingBuildingCount={platformMatchingBuildingCount}
            matchingBuildingCountCapped={matchingBuildingCountCapped}
          />
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="text-[11px] font-medium leading-none text-slate-500">
          {timestamp}
        </span>
      </span>
    </button>
  )
}

export const ExploreOpportunitiesListItem = memo(
  ExploreOpportunitiesListItemComponent,
)
