import { ExploreOpportunitiesAreaMap } from "../area/ExploreOpportunitiesAreaMap"
import { ExploreOpportunitiesList } from "../list/ExploreOpportunitiesList"
import { ExploreOpportunitiesMatchTabs } from "../list/ExploreOpportunitiesMatchTabs"

/** Left / list page stack: explore area → match tabs → opportunity list. */
export function ExploreOpportunitiesListPane() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <ExploreOpportunitiesAreaMap />
      <ExploreOpportunitiesMatchTabs />
      <ExploreOpportunitiesList />
    </div>
  )
}
