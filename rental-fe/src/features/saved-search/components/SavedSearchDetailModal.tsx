import { useRef } from "react"

import type { SavedSearch } from "@/features/saved-search/api"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"

import { SavedSearchDetailPane } from "./SavedSearchDetailPane"

type SavedSearchDetailModalProps = {
  savedSearch: SavedSearch | null
  isOpen: boolean
  onClose: () => void
  /** Clears selection after close/delete from the detail pane. */
  onRequestRemoved?: (savedSearchId: string) => void
}

/**
 * Request detail overlay: full-screen on mobile, centered sheet on desktop
 * (shared ResponsiveScreenModal defaults — same pattern as ListingDetailModal).
 */
export function SavedSearchDetailModal({
  savedSearch,
  isOpen,
  onClose,
  onRequestRemoved,
}: SavedSearchDetailModalProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)

  return (
    <ResponsiveScreenModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={savedSearch?.name ?? "Saved search details"}
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
            <SavedSearchDetailPane
              selected={savedSearch}
              scrollRootRef={scrollRootRef}
              onRequestRemoved={onRequestRemoved}
            />
          </div>
        </>
      )}
    </ResponsiveScreenModal>
  )
}
