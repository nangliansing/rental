import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
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
  const [suppressListUntilSettled, setSuppressListUntilSettled] = useState(false)
  const { selectedPlaceId } = useNeighbourhoodExploreSelection()
  const listScrollRootRef = useRef<HTMLDivElement>(null)
  const isDrawerExpanded = snap !== "peek"

  const handleSnapChange = useCallback((nextSnap: DraggableBottomDrawerSnap) => {
    setSnap(nextSnap)
  }, [])

  const handleSnapSettled = useCallback(() => {
    setSuppressListUntilSettled(false)
  }, [])

  useEffect(() => {
    if (selectedPlaceId && snap === "peek") {
      setSuppressListUntilSettled(true)
      setSnap("half")
    }
  }, [selectedPlaceId, snap])

  return (
    <div className="relative min-h-0 flex-1 bg-slate-50">
      <NeighbourhoodExploreMapStack />

      <DraggableBottomDrawer
        snap={snap}
        onSnapChange={handleSnapChange}
        onSnapSettled={handleSnapSettled}
        testId="neighbourhood-explore-results-drawer"
        ariaLabel="Nearby places"
        contentRef={listScrollRootRef}
        contentClassName={cn(
          suppressListUntilSettled && "pointer-events-none invisible",
        )}
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
          isListScrollEnabled={isDrawerExpanded}
        />
      </DraggableBottomDrawer>
    </div>
  )
}
