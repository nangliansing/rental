import { useCallback, useState } from "react"
import { X } from "lucide-react"

import {
  DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  useSearchOwnerClientRequests,
  type ClientRequestStatus,
} from "@/features/client-request/api"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { FilterPills } from "@/shared/components/inputs/FilterPills"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"

import { ClientRequestDetailPane } from "./ClientRequestDetailPane"
import { ClientRequestList } from "./ClientRequestList"

const CLIENT_REQUEST_WORKSPACE_HEIGHT_CLASS =
  "h-[calc(100dvh-13.5rem)] min-h-[24rem]"

const CLIENT_REQUEST_STATUS_PILLS: {
  label: string
  value: ClientRequestStatus
}[] = [
  { value: "Waiting", label: "Waiting" },
  { value: "Closed", label: "Closed" },
]

const CLIENT_REQUEST_STATUS_COPY: Record<
  ClientRequestStatus,
  {
    subtitle: string
    emptyTitle: string
    emptyDescription: string
  }
> = {
  Waiting: {
    subtitle: "Open requests for your clients",
    emptyTitle: "No waiting requests",
    emptyDescription:
      "Client requests you create will show up here while they are waiting.",
  },
  Closed: {
    subtitle: "Requests you have closed",
    emptyTitle: "No closed requests",
    emptyDescription:
      "Closed client requests will appear here once you mark them done.",
  },
}

export function ClientRequestWorkspace() {
  const [status, setStatus] = useState<ClientRequestStatus>(
    DEFAULT_OWNER_CLIENT_REQUEST_STATUS,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const query = useSearchOwnerClientRequests({ status })
  const items = query.data?.pages.flatMap((page) => page.data) ?? []
  const selected =
    selectedId == null
      ? null
      : (items.find((item) => item._id === selectedId) ?? null)
  const statusCopy = CLIENT_REQUEST_STATUS_COPY[status]

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleStatusChange = useCallback((nextStatus: ClientRequestStatus) => {
    setStatus(nextStatus)
    setSelectedId(null)
  }, [])

  const isMobileDetailOpen = !isDesktop && selectedId != null

  return (
    <>
      <section
        className={`${CLIENT_REQUEST_WORKSPACE_HEIGHT_CLASS} flex min-h-0 overflow-hidden border-y border-slate-200 bg-[#F0F2F5] md:grid md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:rounded-lg md:border`}
        aria-label="Client requests"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200 bg-white md:border-r">
          <div className="shrink-0 space-y-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Client requests
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {statusCopy.subtitle}
              </p>
            </div>

            <FilterPills
              options={CLIENT_REQUEST_STATUS_PILLS}
              value={status}
              aria-label="Client request status"
              onChange={(nextStatus) => {
                if (nextStatus) handleStatusChange(nextStatus)
              }}
              className="mt-0"
            />
          </div>

          <ClientRequestList
            items={items}
            selectedId={selectedId}
            onSelect={handleSelect}
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
        </div>

        <div className="hidden min-h-0 overflow-y-auto overscroll-contain bg-[#F0F2F5] md:block">
          <ClientRequestDetailPane selected={selected} />
        </div>
      </section>

      <ResponsiveScreenModal
        isOpen={isMobileDetailOpen}
        onClose={handleClearSelection}
        ariaLabel={selected?.name ?? "Client request details"}
        panelClassName="h-dvh md:h-dvh md:max-w-none md:rounded-none"
      >
        {({ requestClose }) => (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F0F2F5]">
            <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                aria-label="Close client request details"
                onClick={requestClose}
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="min-w-0 truncate text-base font-semibold text-slate-950">
                {selected?.name ?? "Client request"}
              </h2>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ClientRequestDetailPane selected={selected} />
            </div>
          </div>
        )}
      </ResponsiveScreenModal>
    </>
  )
}
