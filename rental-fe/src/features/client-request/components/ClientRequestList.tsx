import { useRef } from "react"

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
}: ClientRequestListProps) {
  const listRootRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={listRootRef}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
      data-testid="client-request-list-scroller"
    >
      <ClientRequestListState
        isLoading={isLoading}
        error={error && items.length === 0 ? error : null}
        errorFallback="Could not load client requests."
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
            selected={item._id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ClientRequestListState>
    </div>
  )
}
