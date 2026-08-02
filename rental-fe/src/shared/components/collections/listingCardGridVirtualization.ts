export const LISTING_CARD_GRID_GAP_CLASS = "gap-0.5 md:gap-1"

export const LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD = 24

export const LISTING_CARD_GRID_RESPONSIVE_BREAKPOINT_PX = 640

export const LISTING_CARD_GRID_GAP_PX = {
  default: 2,
  md: 4,
} as const

export type ListingCardGridColumns = "responsive" | "two"

export function getListingGridColumnCount(
  columns: ListingCardGridColumns,
  containerWidth: number,
) {
  if (columns === "two") return 2

  return containerWidth >= LISTING_CARD_GRID_RESPONSIVE_BREAKPOINT_PX ? 3 : 2
}

export function groupListingGridRows<T>(
  items: readonly T[],
  columnCount: number,
) {
  if (columnCount <= 0) return []

  const rows: T[][] = []

  for (let index = 0; index < items.length; index += columnCount) {
    rows.push(items.slice(index, index + columnCount))
  }

  return rows
}

export function estimateListingGridRowHeightPx(
  containerWidth: number,
  columnCount: number,
  gapPx = LISTING_CARD_GRID_GAP_PX.default,
) {
  if (containerWidth <= 0 || columnCount <= 0) return 180

  const totalGap = gapPx * Math.max(columnCount - 1, 0)
  const cellWidth = (containerWidth - totalGap) / columnCount

  return Math.max(cellWidth, 0) + gapPx
}

export function getListingGridRowKey<T>(
  row: readonly T[],
  rowIndex: number,
  getItemKey: (item: T) => string,
) {
  const firstItem = row[0]
  if (!firstItem) return `listing-grid-row-${rowIndex}`

  return `${rowIndex}-${getItemKey(firstItem)}`
}
