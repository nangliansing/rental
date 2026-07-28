import { useEffect, useRef, useState } from "react"

import {
  DraggableBottomDrawer,
  DraggableBottomDrawerDragRegion,
  type DraggableBottomDrawerSnap,
} from "@/shared/components/navigation/DraggableBottomDrawer"

import { useNeighbourhoodExploreSelection } from "../../NeighbourhoodExploreContext"
import { NeighbourhoodPlaceListPanel } from "../list/NeighbourhoodPlaceListPanel"
import { NeighbourhoodExploreMapStack } from "./NeighbourhoodExploreMapStack"

export function NeighbourhoodExploreMobileBody() {
  const [snap, setSnap] = useState<DraggableBottomDrawerSnap>("half")
  const { selectedPlaceId } = useNeighbourhoodExploreSelection()
  const listScrollRootRef = useRef<HTMLDivElement>(null)
  const isListScrollEnabled = snap !== "peek"

  useEffect(() => {
    if (selectedPlaceId && snap === "peek") {
      setSnap("half")
    }
  }, [selectedPlaceId, snap])

  return (
    <div className="relative min-h-0 flex-1 bg-slate-50">
      <NeighbourhoodExploreMapStack />

      <DraggableBottomDrawer
        snap={snap}
        onSnapChange={setSnap}
        testId="neighbourhood-explore-results-drawer"
        ariaLabel="Nearby places"
        contentRef={listScrollRootRef}
        contentClassName="h-[calc(100%-52px)]"
        header={(dragHandle) => (
          <DraggableBottomDrawerDragRegion
            dragHandle={dragHandle}
            className="px-4 pb-2 pt-3"
          >
            <p className="text-sm font-semibold text-slate-950">Nearby places</p>
          </DraggableBottomDrawerDragRegion>
        )}
      >
        <NeighbourhoodPlaceListPanel
          className="min-h-0"
          scrollRootRef={listScrollRootRef}
          scrollSyncKey={snap}
          isListScrollEnabled={isListScrollEnabled}
        />
      </DraggableBottomDrawer>
    </div>
  )
}
