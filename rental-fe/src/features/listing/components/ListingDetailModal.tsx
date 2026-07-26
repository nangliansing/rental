import { ArrowLeft, FileQuestion, Loader2, X } from "lucide-react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import { useListingDetailData } from "../hooks/useListingDetailData"
import { ListingDetailContent } from "./ListingDetailContent"

type ListingDetailModalProps = {
  listingId: string | null
  onClose: () => void
  onListingSelect?: (listingId: string) => void
  mobileBackLabel?: string
  desktopBackLabel?: string
  trackBrowserHistory?: boolean
}

export function ListingDetailModal({
  listingId,
  onClose,
  onListingSelect,
  mobileBackLabel = "Back",
  desktopBackLabel = "Back",
  trackBrowserHistory = true,
}: ListingDetailModalProps) {
  const { containerRef, onBackdropClick, requestClose } = useAccessibleModal<HTMLElement>({
    isOpen: Boolean(listingId),
    onClose,
    trackBrowserHistory,
  })
  const { isAuthenticated } = useAuth()
  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })
  const { listing, isLoading, viewerUserId } = useListingDetailData({
    listingId,
  })

  if (!listingId) return null

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] bg-slate-950/45 md:flex md:items-center md:justify-center md:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Listing details"
        onClick={onBackdropClick}
      >
        <section
          ref={containerRef}
          tabIndex={-1}
          className="flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-950 md:h-[min(860px,calc(100dvh-2rem))] md:max-w-2xl md:rounded-2xl md:shadow-2xl"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={requestClose}
            >
              <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              <span className="md:hidden">{mobileBackLabel}</span>
              <span className="hidden md:inline">{desktopBackLabel}</span>
            </button>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:flex"
              aria-label="Close listing details"
              onClick={requestClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
            {isLoading ? (
              <div className="flex min-h-[55vh] items-center justify-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading listing...
              </div>
            ) : listing ? (
              <ListingDetailContent
                listing={listing}
                currentUserId={viewerUserId}
                canCreateListing={agentProfileQuery.canCreateListing}
                onDeleted={onClose}
                onListingSelect={onListingSelect}
              />
            ) : (
              <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
                <FileQuestion className="h-14 w-14 text-slate-400" />
                <h2 className="mt-5 text-2xl font-semibold text-slate-950">
                  Listing not found
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  This saved listing may be private, removed, or no longer
                  available to view.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </ModalPortal>
  )
}
