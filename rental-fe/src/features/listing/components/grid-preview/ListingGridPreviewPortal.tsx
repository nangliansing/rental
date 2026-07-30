import { ListingGridPreviewModal } from "./ListingGridPreviewModal"
import type { useListingGridPreview } from "./useListingGridPreview"

type ListingGridPreviewController = ReturnType<typeof useListingGridPreview>

export type ListingGridPreviewPortalProps = {
  preview: ListingGridPreviewController
  onOpenDetail: (listingId: string) => void
  showBuildingName?: boolean
}

export function ListingGridPreviewPortal({
  preview,
  onOpenDetail,
  showBuildingName,
}: ListingGridPreviewPortalProps) {
  return (
    <ListingGridPreviewModal
      listing={preview.previewListing}
      onClose={preview.closePreview}
      showBuildingName={showBuildingName}
      skipHistorySyncOnCloseRef={preview.skipHistorySyncOnCloseRef}
      onOpenDetail={(listingId) => {
        preview.closePreview({ handoffToDetail: true })
        onOpenDetail(listingId)
      }}
    />
  )
}
