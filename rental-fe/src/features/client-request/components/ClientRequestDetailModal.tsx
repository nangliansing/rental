import { useRef } from "react"

import type { ClientRequest } from "@/features/client-request/api"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"

import { ClientRequestDetailPane } from "./ClientRequestDetailPane"

type ClientRequestDetailModalProps = {
  clientRequest: ClientRequest | null
  isOpen: boolean
  onClose: () => void
  /** Clears selection after close/delete from the detail pane. */
  onRequestRemoved?: (clientRequestId: string) => void
}

/**
 * Request detail overlay: full-screen on mobile, centered sheet on desktop
 * (shared ResponsiveScreenModal defaults — same pattern as ListingDetailModal).
 */
export function ClientRequestDetailModal({
  clientRequest,
  isOpen,
  onClose,
  onRequestRemoved,
}: ClientRequestDetailModalProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)

  return (
    <ResponsiveScreenModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={clientRequest?.name ?? "Saved search details"}
      size="wide"
    >
      {({ requestClose }) => (
        <>
          <ModalDismissHeader
            onClose={requestClose}
            closeLabel="Close saved search details"
            title="Saved search"
          />
          <div
            ref={scrollRootRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white"
          >
            <ClientRequestDetailPane
              selected={clientRequest}
              scrollRootRef={scrollRootRef}
              onRequestRemoved={onRequestRemoved}
            />
          </div>
        </>
      )}
    </ResponsiveScreenModal>
  )
}
