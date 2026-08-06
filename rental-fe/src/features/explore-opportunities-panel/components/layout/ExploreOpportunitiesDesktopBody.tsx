import { ExploreOpportunitiesDetailPane } from "../detail/ExploreOpportunitiesDetailPane"
import { ExploreOpportunitiesListPane } from "./ExploreOpportunitiesListPane"

export function ExploreOpportunitiesDesktopBody() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden">
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-slate-200">
        <ExploreOpportunitiesListPane />
      </aside>
      <section className="flex min-h-0 flex-col overflow-hidden bg-slate-50/60">
        <ExploreOpportunitiesDetailPane />
      </section>
    </div>
  )
}
