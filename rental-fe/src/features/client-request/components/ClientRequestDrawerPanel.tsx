import { useCallback, useState, type RefObject } from "react"

import {
  DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  useSearchOwnerClientRequests,
  type ClientRequestStatus,
} from "@/features/client-request/api"
import { FilterPills } from "@/shared/components/inputs/FilterPills"

import { ClientRequestDetailModal } from "./ClientRequestDetailModal"
import { ClientRequestList } from "./ClientRequestList"
import {
  CLIENT_REQUEST_STATUS_COPY,
  CLIENT_REQUEST_STATUS_PILLS,
} from "./clientRequestStatusUi"

type ClientRequestDrawerPanelProps = {
  enabled?: boolean
  /** FloatingActionPanel body scroller — used for infinite scroll. */
  scrollRootRef: RefObject<HTMLDivElement | null>
}

/** Owner request list for FloatingActionPanel / drawer surfaces. */
export function ClientRequestDrawerPanel({
  enabled = true,
  scrollRootRef,
}: ClientRequestDrawerPanelProps) {
  const [status, setStatus] = useState<ClientRequestStatus>(
    DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const query = useSearchOwnerClientRequests({ status, enabled })
  const items = query.data?.pages.flatMap((page) => page.data) ?? []
  const selected =
    selectedId == null
      ? null
      : (items.find((item) => item._id === selectedId) ?? null)
  const statusCopy = CLIENT_REQUEST_STATUS_COPY[status]

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleRequestRemoved = useCallback((_clientRequestId: string) => {
    setSelectedId(null)
  }, [])

  const handleStatusChange = useCallback((nextStatus: ClientRequestStatus) => {
    setStatus(nextStatus)
    setSelectedId(null)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-10 space-y-3 border-b border-slate-100 bg-white px-4 py-3">
        <FilterPills
          options={CLIENT_REQUEST_STATUS_PILLS}
          value={status}
          aria-label="Saved search status"
          onChange={(nextStatus) => {
            if (nextStatus) handleStatusChange(nextStatus)
          }}
          className="mt-0"
        />
      </div>

      <ClientRequestList
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

      <ClientRequestDetailModal
        isOpen={selectedId != null}
        clientRequest={selected}
        onClose={handleClearSelection}
        onRequestRemoved={handleRequestRemoved}
      />
    </>
  )
}
