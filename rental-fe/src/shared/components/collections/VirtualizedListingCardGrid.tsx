import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode, RefObject } from "react"
import {
  useVirtualizer,
  useWindowVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual"

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

type VirtualizedListingCardGridProps<T> = {
  items: readonly T[]
  renderItem: (item: T) => ReactNode
  getItemKey: (item: T) => string
  columns?: ListingCardGridColumns
  className?: string
  rootRef?: RefObject<HTMLElement | null>
  testId?: string
}

type VirtualizedListingCardGridBodyProps<T> = Omit<
  VirtualizedListingCardGridProps<T>,
  "rootRef"
>

type SharedVirtualizer = Pick<
  Virtualizer<HTMLElement, Element>,
  "getTotalSize" | "getVirtualItems" | "measureElement" | "options"
>

function useListingGridRows<T>(
  items: readonly T[],
  columns: ListingCardGridColumns,
  listRef: RefObject<HTMLDivElement | null>,
) {
  const [containerWidth, setContainerWidth] = useState(0)
  const columnCount = useListingGridColumnCount(columns, listRef)

  const rows = useMemo(
    () => groupListingGridRows(items, columnCount),
    [columnCount, items],
  )

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measureWidth = () => {
      setContainerWidth(list.clientWidth)
    }

    measureWidth()

    const observer = new ResizeObserver(measureWidth)
    observer.observe(list)

    return () => observer.disconnect()
  }, [listRef, rows.length])

  return {
    rows,
    columnCount,
    containerWidth,
  }
}

function VirtualizedListingCardGridBody<T>({
  listRef,
  virtualizer,
  scrollMargin,
  rows,
  columns,
  className,
  testId,
  renderItem,
  getItemKey,
}: {
  listRef: RefObject<HTMLDivElement | null>
  virtualizer: SharedVirtualizer
  scrollMargin: number
  rows: readonly (readonly T[])[]
  columns: ListingCardGridColumns
  className?: string
  testId?: string
  renderItem: (item: T) => ReactNode
  getItemKey: (item: T) => string
}) {
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

function WindowVirtualizedListingCardGrid<T>({
  items,
  renderItem,
  getItemKey,
  columns = "responsive",
  className,
  testId,
}: VirtualizedListingCardGridBodyProps<T>) {
  "use no memo"

  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const { rows, columnCount, containerWidth } = useListingGridRows(
    items,
    columns,
    listRef,
  )

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const measureScrollMargin = () => {
      setScrollMargin((current) => {
        const nextMargin = list.offsetTop
        return Math.abs(current - nextMargin) < 1 ? current : nextMargin
      })
    }

    measureScrollMargin()

    const observer = new ResizeObserver(measureScrollMargin)
    observer.observe(list)

    return () => observer.disconnect()
  }, [rows.length])

  // TanStack Virtual owns imperative measurements; keep hook methods untouched.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () =>
      estimateListingGridRowHeightPx(containerWidth, columnCount),
    getItemKey: (index) =>
      getListingGridRowKey(rows[index] ?? [], index, getItemKey),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 2,
    scrollMargin,
  })

  return (
    <VirtualizedListingCardGridBody
      listRef={listRef}
      virtualizer={virtualizer}
      scrollMargin={virtualizer.options.scrollMargin}
      rows={rows}
      columns={columns}
      className={className}
      testId={testId}
      renderItem={renderItem}
      getItemKey={getItemKey}
    />
  )
}

function ElementVirtualizedListingCardGrid<T>({
  items,
  renderItem,
  getItemKey,
  columns = "responsive",
  className,
  testId,
  rootRef,
}: VirtualizedListingCardGridBodyProps<T> & {
  rootRef: RefObject<HTMLElement | null>
}) {
  "use no memo"

  const listRef = useRef<HTMLDivElement | null>(null)
  const { rows, columnCount, containerWidth } = useListingGridRows(
    items,
    columns,
    listRef,
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => rootRef.current,
    estimateSize: () =>
      estimateListingGridRowHeightPx(containerWidth, columnCount),
    getItemKey: (index) =>
      getListingGridRowKey(rows[index] ?? [], index, getItemKey),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 2,
  })

  return (
    <VirtualizedListingCardGridBody
      listRef={listRef}
      virtualizer={virtualizer}
      scrollMargin={0}
      rows={rows}
      columns={columns}
      className={className}
      testId={testId}
      renderItem={renderItem}
      getItemKey={getItemKey}
    />
  )
}

export function VirtualizedListingCardGrid<T>({
  rootRef,
  ...props
}: VirtualizedListingCardGridProps<T>) {
  if (rootRef) {
    return <ElementVirtualizedListingCardGrid {...props} rootRef={rootRef} />
  }

  return <WindowVirtualizedListingCardGrid {...props} />
}
