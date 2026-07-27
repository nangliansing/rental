import { NeighbourhoodPlaceListPanel } from "../list/NeighbourhoodPlaceListPanel"
import { NeighbourhoodExploreMapStack } from "./NeighbourhoodExploreMapStack"

export function NeighbourhoodExploreDesktopBody() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative min-h-0 min-w-0 flex-1 bg-slate-50">
        <NeighbourhoodExploreMapStack />
      </div>

      <aside className="flex min-h-0 w-[min(100%,340px)] shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">Nearby places</p>
        </div>
        <NeighbourhoodPlaceListPanel className="flex min-h-0 flex-1 flex-col" />
      </aside>
    </div>
  )
}
