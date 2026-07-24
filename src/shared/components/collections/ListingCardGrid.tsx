import type { ReactNode, RefObject } from "react"

import { cn } from "@/lib/utils"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

export const LISTING_CARD_GRID_GAP_CLASS = "gap-0.5 md:gap-1"

type ListingCardGridProps = {
  children: ReactNode
  className?: string
  columns?: "responsive" | "two"
  endMessage?: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isFetchNextPageError?: boolean
  loadMoreErrorMessage?: string
  onFetchNextPage?: () => void
  rootRef?: RefObject<HTMLElement | null>
  testId?: string
}

export function ListingCardGrid({
  children,
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
}: ListingCardGridProps) {
  const hasPagination =
    typeof hasNextPage === "boolean" && Boolean(onFetchNextPage)

  return (
    <>
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
