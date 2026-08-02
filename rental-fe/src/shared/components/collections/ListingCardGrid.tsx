import type { ReactNode, RefObject } from "react"

import { cn } from "@/lib/utils"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

import {
  LISTING_CARD_GRID_GAP_CLASS,
  LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD,
  type ListingCardGridColumns,
} from "./listingCardGridVirtualization"
import { VirtualizedListingCardGrid } from "./VirtualizedListingCardGrid"

type ListingCardGridPaginationProps = {
  endMessage?: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isFetchNextPageError?: boolean
  loadMoreErrorMessage?: string
  onFetchNextPage?: () => void
  rootRef?: RefObject<HTMLElement | null>
}

type ListingCardGridBaseProps = ListingCardGridPaginationProps & {
  className?: string
  columns?: ListingCardGridColumns
  testId?: string
  virtualizeFrom?: number
}

type ListingCardGridItemsProps<T> = ListingCardGridBaseProps & {
  items: readonly T[]
  renderItem: (item: T) => ReactNode
  getItemKey: (item: T) => string
  children?: never
}

type ListingCardGridChildrenProps = ListingCardGridBaseProps & {
  children: ReactNode
  items?: never
  renderItem?: never
  getItemKey?: never
}

export type ListingCardGridProps<T = unknown> =
  | ListingCardGridItemsProps<T>
  | ListingCardGridChildrenProps

function StaticListingCardGrid({
  columns = "responsive",
  className,
  testId,
  children,
}: {
  columns?: ListingCardGridColumns
  className?: string
  testId?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2",
        columns === "responsive" && "sm:grid-cols-3",
        LISTING_CARD_GRID_GAP_CLASS,
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

function ItemsListingCardGrid<T>({
  items,
  renderItem,
  getItemKey,
  columns = "responsive",
  className,
  rootRef,
  testId,
  virtualizeFrom = LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD,
}: ListingCardGridItemsProps<T>) {
  if (items.length >= virtualizeFrom) {
    return (
      <VirtualizedListingCardGrid
        items={items}
        renderItem={renderItem}
        getItemKey={getItemKey}
        columns={columns}
        className={className}
        rootRef={rootRef}
        testId={testId}
      />
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2",
        columns === "responsive" && "sm:grid-cols-3",
        LISTING_CARD_GRID_GAP_CLASS,
        className,
      )}
      data-testid={testId}
    >
      {items.map((item) => (
        <div key={getItemKey(item)} className="min-w-0">
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}

export function ListingCardGrid<T>(props: ListingCardGridProps<T>) {
  const {
    className,
    columns = "responsive",
    endMessage = "No more listings",
    hasNextPage,
    isFetchingNextPage = false,
    isFetchNextPageError = false,
    loadMoreErrorMessage,
    onFetchNextPage,
    rootRef,
    testId,
    virtualizeFrom,
  } = props

  const hasPagination =
    typeof hasNextPage === "boolean" && Boolean(onFetchNextPage)

  const gridBody = (() => {
    if ("items" in props) {
      const itemsProps = props as ListingCardGridItemsProps<T>

      return (
        <ItemsListingCardGrid
          items={itemsProps.items}
          renderItem={itemsProps.renderItem}
          getItemKey={itemsProps.getItemKey}
          columns={columns}
          className={className}
          rootRef={rootRef}
          testId={testId}
          virtualizeFrom={virtualizeFrom}
        />
      )
    }

    return (
      <StaticListingCardGrid
        columns={columns}
        className={className}
        testId={testId}
      >
        {props.children}
      </StaticListingCardGrid>
    )
  })()

  return (
    <>
      {gridBody}

      {hasPagination && onFetchNextPage && (
        <InfiniteScrollSentinel
          rootRef={rootRef}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isFetchNextPageError={isFetchNextPageError}
          errorMessage={loadMoreErrorMessage}
          onFetchNextPage={onFetchNextPage}
          endMessage={endMessage}
        />
      )}
    </>
  )
}
