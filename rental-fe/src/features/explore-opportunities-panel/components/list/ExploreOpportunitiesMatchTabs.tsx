import {
  FilterPills,
  type FilterPillOption,
} from "@/shared/components/inputs/FilterPills"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"
import { useExploreOpportunitiesSelection } from "../../context/ExploreOpportunitiesSelectionContext"
import type { ExploreOpportunitiesMatchTab } from "../../types"

const MATCH_TAB_OPTIONS: FilterPillOption<ExploreOpportunitiesMatchTab>[] = [
  {
    value: "unmatched",
    label: EXPLORE_OPPORTUNITIES_PANEL_COPY.unmatchedTab,
  },
  {
    value: "matched",
    label: EXPLORE_OPPORTUNITIES_PANEL_COPY.matchedTab,
  },
]

export function ExploreOpportunitiesMatchTabs() {
  const { matchTab, setMatchTab } = useExploreOpportunitiesSelection()

  return (
    <div className="shrink-0 px-3 py-3">
      <FilterPills
        options={MATCH_TAB_OPTIONS}
        value={matchTab}
        aria-label={EXPLORE_OPPORTUNITIES_PANEL_COPY.matchTabsAriaLabel}
        className="mt-0"
        onChange={(nextTab) => {
          if (nextTab) setMatchTab(nextTab)
        }}
      />
    </div>
  )
}
