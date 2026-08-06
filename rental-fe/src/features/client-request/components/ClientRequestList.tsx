import { useRef, type RefObject } from "react"

import type { ClientRequest } from "@/features/client-request/api"
import { cn } from "@/lib/utils"
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/shared/components/navigation/mobileNavLayout"

import { ClientRequestListItem } from "./ClientRequestListItem"
import { ClientRequestListState } from "./ClientRequestListState"
import {
  formatClientRequestListPreview,
  formatClientRequestListTimestamp,
} from "./formatClientRequestListMeta"

type ClientRequestListProps = {
  items: ClientRequest[]
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

export function ClientRequestList({
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
}: ClientRequestListProps) {
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
      data-testid="client-request-list-scroller"
    >
      <ClientRequestListState
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
          <ClientRequestListItem
            key={item._id}
            id={item._id}
            name={item.name}
            preview={formatClientRequestListPreview(item)}
            timestamp={formatClientRequestListTimestamp(item.updatedAt)}
            matchingCount={item.matchingCount}
            selected={item._id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ClientRequestListState>
    </div>
  )
}
