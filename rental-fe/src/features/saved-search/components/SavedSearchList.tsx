import { useRef, type RefObject } from "react"

import type { SavedSearch } from "@/features/saved-search/api"
import { cn } from "@/lib/utils"
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/shared/components/navigation/mobileNavLayout"

import { SavedSearchListItem } from "./SavedSearchListItem"
import { SavedSearchListState } from "./SavedSearchListState"
import {
  formatSavedSearchListPreview,
  formatSavedSearchListTimestamp,
} from "./formatSavedSearchListMeta"

type SavedSearchListProps = {
  items: SavedSearch[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  onFetchNextPage: () => void
  emptyTitle: string
  emptyDescription: string
  /**
   * `page` — own scrolling pane (profile workspace).
   * `drawer` — content lives in a parent scroller (FloatingActionPanel body).
   */
  layout?: "page" | "drawer"
  /** Scroll root for infinite scroll; required for accurate `drawer` loading. */
  rootRef?: RefObject<HTMLElement | null>
}

export function SavedSearchList({
  items,
  selectedId,
  onSelect,
  isLoading,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onFetchNextPage,
  emptyTitle,
  emptyDescription,
  layout = "page",
  rootRef,
}: SavedSearchListProps) {
  const internalRootRef = useRef<HTMLDivElement | null>(null)
  const listRootRef = rootRef ?? internalRootRef
  const isDrawer = layout === "drawer"

  return (
    <div
      ref={isDrawer ? undefined : internalRootRef}
      className={cn(
        "bg-white",
        isDrawer
          ? undefined
          : cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            ),
      )}
      data-testid="saved-search-list-scroller"
    >
      <SavedSearchListState
        isLoading={isLoading}
        error={error && items.length === 0 ? error : null}
        errorFallback="Could not load saved searches."
        isEmpty={items.length === 0}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRetry={onRetry}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        onFetchNextPage={onFetchNextPage}
        rootRef={listRootRef}
      >
        {items.map((item) => (
          <SavedSearchListItem
            key={item._id}
            id={item._id}
            name={item.name}
            preview={formatSavedSearchListPreview(item)}
            timestamp={formatSavedSearchListTimestamp(
              item.lastConfirmedAt ?? item.createdAt,
            )}
            myMatchingBuildingCount={item.myMatchingBuildingCount}
            platformMatchingBuildingCount={
              item.platformMatchingBuildingCount
            }
            matchingBuildingCountCapped={item.matchingBuildingCountCapped}
            selected={item._id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </SavedSearchListState>
    </div>
  )
}
