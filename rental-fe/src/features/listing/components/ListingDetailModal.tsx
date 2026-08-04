import { FileQuestion } from "lucide-react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { NeighbourhoodExploreDialogProvider } from "@/features/buildings/neighbourhood-explore"
import { useMyAgentProfile } from "@/features/profile/api"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/shared/components/navigation/mobileNavLayout"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"
import { cn } from "@/lib/utils"

import { useListingDetailData } from "../hooks/useListingDetailData"
import { ListingDetailContent } from "./ListingDetailContent"

type ListingDetailModalProps = {
  listingId: string | null
  onClose: () => void
  onListingSelect?: (listingId: string) => void
  trackBrowserHistory?: boolean
}

export function ListingDetailModal({
  listingId,
  onClose,
  onListingSelect,
  trackBrowserHistory = true,
}: ListingDetailModalProps) {
  const { isAuthenticated } = useAuth()
  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })
  const { listing, isLoading, viewerUserId } = useListingDetailData({
    listingId,
  })

  if (!listingId) return null

  return (
    <ResponsiveScreenModal
      isOpen
      onClose={onClose}
      ariaLabel="Listing details"
      trackBrowserHistory={trackBrowserHistory}
    >
      {({ requestClose }) => (
        <>
          <ModalDismissHeader
            onClose={requestClose}
            closeLabel="Close listing details"
          />

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              MOBILE_NAV_SCROLL_PADDING_CLASS,
            )}
          >
            {isLoading ? (
              <div className="flex min-h-[55vh] items-center justify-center gap-2 text-sm font-medium text-slate-500">
                <LoaderIcon className="h-4 w-4" />
                Loading listing...
              </div>
            ) : listing ? (
              <NeighbourhoodExploreDialogProvider
                buildingId={listing.buildingId}
                trackBrowserHistory={false}
              >
                <ListingDetailContent
                  listing={listing}
                  currentUserId={viewerUserId}
                  canCreateListing={agentProfileQuery.canCreateListing}
                  onDeleted={onClose}
                  onListingSelect={onListingSelect}
                />
              </NeighbourhoodExploreDialogProvider>
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
        </>
      )}
    </ResponsiveScreenModal>
  )
}
