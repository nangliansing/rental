import { useCallback, useState, type RefObject } from "react"

import {
  DEFAULT_OWNER_SAVED_SEARCH_STATUS,
  useSearchOwnerSavedSearches,
  type SavedSearchStatus,
} from "@/features/saved-search/api"
import { FilterPills } from "@/shared/components/inputs/FilterPills"

import { SavedSearchDetailModal } from "./SavedSearchDetailModal"
import { SavedSearchList } from "./SavedSearchList"
import {
  SAVED_SEARCH_STATUS_COPY,
  SAVED_SEARCH_STATUS_PILLS,
} from "./savedSearchStatusUi"

type SavedSearchDrawerPanelProps = {
  enabled?: boolean
  /** FloatingActionPanel body scroller — used for infinite scroll. */
  scrollRootRef: RefObject<HTMLDivElement | null>
}

/** Owner request list for FloatingActionPanel / drawer surfaces. */
export function SavedSearchDrawerPanel({
  enabled = true,
  scrollRootRef,
}: SavedSearchDrawerPanelProps) {
  const [status, setStatus] = useState<SavedSearchStatus>(
    DEFAULT_OWNER_SAVED_SEARCH_STATUS,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const query = useSearchOwnerSavedSearches({ status, enabled })
  const items = query.data?.pages.flatMap((page) => page.data) ?? []
  const selected =
    selectedId == null
      ? null
      : (items.find((item) => item._id === selectedId) ?? null)
  const statusCopy = SAVED_SEARCH_STATUS_COPY[status]

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleRequestRemoved = useCallback((_savedSearchId: string) => {
    setSelectedId(null)
  }, [])

  const handleStatusChange = useCallback((nextStatus: SavedSearchStatus) => {
    setStatus(nextStatus)
    setSelectedId(null)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-10 space-y-3 border-b border-slate-100 bg-white px-4 py-3">
        <FilterPills
          options={SAVED_SEARCH_STATUS_PILLS}
          value={status}
          aria-label="Saved search status"
          onChange={(nextStatus) => {
            if (nextStatus) handleStatusChange(nextStatus)
          }}
          className="mt-0"
        />
      </div>

      <SavedSearchList
        layout="drawer"
        rootRef={scrollRootRef}
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        hasNextPage={Boolean(query.hasNextPage)}
        isFetchingNextPage={query.isFetchingNextPage}
        isFetchNextPageError={query.isFetchNextPageError}
        onFetchNextPage={() => void query.fetchNextPage()}
        emptyTitle={statusCopy.emptyTitle}
        emptyDescription={statusCopy.emptyDescription}
      />

      <SavedSearchDetailModal
        isOpen={selectedId != null}
        savedSearch={selected}
        onClose={handleClearSelection}
        onRequestRemoved={handleRequestRemoved}
      />
    </>
  )
}
