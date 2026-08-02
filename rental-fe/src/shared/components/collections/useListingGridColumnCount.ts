import { useLayoutEffect, useState, type RefObject } from "react"

import {
  getListingGridColumnCount,
  type ListingCardGridColumns,
} from "./listingCardGridVirtualization"

export function useListingGridColumnCount(
  columns: ListingCardGridColumns,
  containerRef: RefObject<HTMLElement | null>,
) {
  const [columnCount, setColumnCount] = useState(() =>
    columns === "two" ? 2 : 2,
  )

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateColumnCount = () => {
      const nextCount = getListingGridColumnCount(columns, container.clientWidth)
      setColumnCount((current) => (current === nextCount ? current : nextCount))
    }

    updateColumnCount()

    const observer = new ResizeObserver(updateColumnCount)
    observer.observe(container)

    return () => observer.disconnect()
  }, [columns, containerRef])

  return columnCount
}
