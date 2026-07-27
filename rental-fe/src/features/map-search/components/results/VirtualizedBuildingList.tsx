import { useLayoutEffect, useRef, useState } from "react"
import type React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import { cn } from "@/lib/utils"
import type { SearchBuilding } from "../../types"
import {
  BUILDING_LIST_CONTAINER_CLASS,
  getBuildingAtIndex,
  getEstimatedBuildingListItemHeightPx,
} from "../../utils/building-list-layout"
import { BuildingListRow, type BuildingListRowProps } from "./BuildingListRow"

type VirtualizedBuildingListProps = Omit<
  BuildingListRowProps,
  "building" | "index" | "className" | "style" | "listItemRef" | "dataIndex"
> & {
  buildings: SearchBuilding[]
  scrollRootRef?: React.RefObject<HTMLElement | null>
}

export function VirtualizedBuildingList({
  buildings,
  scrollRootRef,
  ...rowProps
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
    estimateSize: getEstimatedBuildingListItemHeightPx,
    getItemKey: (index) => buildings[index]?._id ?? index,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 3,
    scrollMargin,
  })

  if (buildings.length === 0) {
    return null
  }

  return (
    <div
      ref={listRef}
      role="list"
      aria-label="Buildings"
      className={cn("relative w-full", BUILDING_LIST_CONTAINER_CLASS)}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const building = getBuildingAtIndex(buildings, virtualItem.index)
        if (!building) return null

        return (
          <BuildingListRow
            key={building._id}
            building={building}
            index={virtualItem.index}
            listItemRef={virtualizer.measureElement}
            dataIndex={virtualItem.index}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
            {...rowProps}
          />
        )
      })}
    </div>
  )
}
