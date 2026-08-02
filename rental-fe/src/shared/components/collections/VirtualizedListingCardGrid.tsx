import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode, RefObject } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import { cn } from "@/lib/utils"

import { LISTING_CARD_GRID_GAP_CLASS } from "./listingCardGridVirtualization"
import {
  estimateListingGridRowHeightPx,
  getListingGridRowKey,
  groupListingGridRows,
  type ListingCardGridColumns,
} from "./listingCardGridVirtualization"
import { useListingGridColumnCount } from "./useListingGridColumnCount"

function getListingGridColumnClass(columns: ListingCardGridColumns) {
  return columns === "responsive" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
}

function resolveScrollElement(rootRef?: RefObject<HTMLElement | null>) {
  if (typeof document === "undefined") return null

  return rootRef?.current ?? document.documentElement
}

type VirtualizedListingCardGridProps<T> = {
  items: readonly T[]
  renderItem: (item: T) => ReactNode
  getItemKey: (item: T) => string
  columns?: ListingCardGridColumns
  className?: string
  rootRef?: RefObject<HTMLElement | null>
  testId?: string
}

export function VirtualizedListingCardGrid<T>({
  items,
  renderItem,
  getItemKey,
  columns = "responsive",
  className,
  rootRef,
  testId,
}: VirtualizedListingCardGridProps<T>) {
  "use no memo"

  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const columnCount = useListingGridColumnCount(columns, listRef)

  const rows = useMemo(
    () => groupListingGridRows(items, columnCount),
    [columnCount, items],
  )

  useLayoutEffect(() => {
    const list = listRef.current
    const scrollRoot = resolveScrollElement(rootRef)
    if (!list || !scrollRoot) return

    const measureLayout = () => {
      setContainerWidth(list.clientWidth)

      const nextMargin =
        list.getBoundingClientRect().top -
        scrollRoot.getBoundingClientRect().top +
        scrollRoot.scrollTop

      setScrollMargin((current) =>
        Math.abs(current - nextMargin) < 1 ? current : nextMargin,
      )
    }

    measureLayout()

    const observer = new ResizeObserver(measureLayout)
    observer.observe(list)
    observer.observe(scrollRoot)

    return () => observer.disconnect()
  }, [rootRef, rows.length])

  // TanStack Virtual owns imperative measurements; keep hook methods untouched.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => resolveScrollElement(rootRef),
    estimateSize: () =>
      estimateListingGridRowHeightPx(containerWidth, columnCount),
    getItemKey: (index) =>
      getListingGridRowKey(rows[index] ?? [], index, getItemKey),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 2,
    scrollMargin,
  })

  if (rows.length === 0) {
    return null
  }

  return (
    <div
      ref={listRef}
      data-testid={testId}
      className={cn("relative w-full", className)}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index]
        if (!row?.length) return null

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className={cn(
              "absolute left-0 top-0 w-full grid",
              getListingGridColumnClass(columns),
              LISTING_CARD_GRID_GAP_CLASS,
            )}
            style={
              {
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              } satisfies CSSProperties
            }
          >
            {row.map((item) => (
              <div key={getItemKey(item)} className="min-w-0">
                {renderItem(item)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
