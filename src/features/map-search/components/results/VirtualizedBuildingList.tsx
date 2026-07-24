import { useLayoutEffect, useRef, useState } from "react"
import type React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import type { SearchBuilding } from "../../types"
import { BuildingCard } from "./BuildingCard"

const ESTIMATED_BUILDING_CARD_HEIGHT = 290

type VirtualizedBuildingListProps = {
  buildings: SearchBuilding[]
  selectedBuildingId: string | null
  isListingSearch: boolean
  canCreateListing: boolean
  scrollRootRef?: React.RefObject<HTMLElement | null>
  onBuildingSelect: (building: SearchBuilding) => void
  onBuildingHoverChange: (buildingId: string | null) => void
  onListExistingBuilding: (building: SearchBuilding) => void
}

export function VirtualizedBuildingList({
  buildings,
  selectedBuildingId,
  isListingSearch,
  canCreateListing,
  scrollRootRef,
  onBuildingSelect,
  onBuildingHoverChange,
  onListExistingBuilding,
}: VirtualizedBuildingListProps) {
  "use no memo"

  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const list = listRef.current
    const scrollRoot = scrollRootRef?.current
    if (!list || !scrollRoot) return

    const measureOffset = () => {
      const nextMargin =
        list.getBoundingClientRect().top -
        scrollRoot.getBoundingClientRect().top +
        scrollRoot.scrollTop

      setScrollMargin((current) =>
        Math.abs(current - nextMargin) < 1 ? current : nextMargin,
      )
    }

    measureOffset()
    const observer = new ResizeObserver(measureOffset)
    observer.observe(list)
    observer.observe(scrollRoot)

    return () => observer.disconnect()
  }, [scrollRootRef])

  // TanStack Virtual owns an imperative measurement engine. React Compiler
  // must leave this hook's returned methods untouched to prevent stale layout.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: buildings.length,
    getScrollElement: () => scrollRootRef?.current ?? null,
    estimateSize: () => ESTIMATED_BUILDING_CARD_HEIGHT,
    getItemKey: (index) => buildings[index]._id,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 3,
    scrollMargin,
  })

  return (
    <div
      ref={listRef}
      role="list"
      aria-label="Buildings"
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const building = buildings[virtualItem.index]

        return (
          <div
            key={building._id}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            role="listitem"
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            <BuildingCard
              building={building}
              isSelected={selectedBuildingId === building._id}
              isListingSearch={isListingSearch}
              onSelect={onBuildingSelect}
              onHoverChange={onBuildingHoverChange}
              canCreateListing={canCreateListing}
              onListHere={onListExistingBuilding}
            />
          </div>
        )
      })}
    </div>
  )
}
