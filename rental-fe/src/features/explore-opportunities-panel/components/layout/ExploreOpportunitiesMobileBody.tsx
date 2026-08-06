import { useExploreOpportunitiesSelection } from "../../context/ExploreOpportunitiesSelectionContext"
import { ExploreOpportunitiesDetailPane } from "../detail/ExploreOpportunitiesDetailPane"
import { ExploreOpportunitiesListPane } from "./ExploreOpportunitiesListPane"

export function ExploreOpportunitiesMobileBody() {
  const { mobilePage } = useExploreOpportunitiesSelection()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {mobilePage === "detail" ? (
        <ExploreOpportunitiesDetailPane />
      ) : (
        <ExploreOpportunitiesListPane />
      )}
    </div>
  )
}
