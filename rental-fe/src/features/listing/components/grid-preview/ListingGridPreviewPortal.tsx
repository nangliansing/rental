import { useCallback, useMemo } from "react"

import {
  ListingGridPreviewModal,
} from "./ListingGridPreviewModal"
import {
  readListingGridPreviewListingId,
  type ListingGridPreviewDetailMode,
  type ListingGridPreviewPortalDetailConfig,
} from "./listingGridPreviewDetailMode"
import type { useListingGridPreview } from "./useListingGridPreview"

type ListingGridPreviewController = ReturnType<typeof useListingGridPreview>

type ListingGridPreviewPortalBaseProps = {
  preview: ListingGridPreviewController
  showBuildingName?: boolean
}

export type ListingGridPreviewPortalProps = ListingGridPreviewPortalBaseProps &
  ListingGridPreviewPortalDetailConfig

export function ListingGridPreviewPortal({
  preview,
  showBuildingName,
  ...detailConfig
}: ListingGridPreviewPortalProps) {
  const closePreviewForDetailHandoff = useCallback(() => {
    preview.closePreview({ handoffToDetail: true })
  }, [preview])

  const handleModalOpenDetail = useCallback(
    (listingId: string) => {
      closePreviewForDetailHandoff()
      if (detailConfig.detailMode === "modal") {
        detailConfig.onOpenDetail(listingId)
      }
    },
    [closePreviewForDetailHandoff, detailConfig],
  )

  const detailMode = useMemo((): ListingGridPreviewDetailMode | null => {
    if (!preview.previewListing) return null

    if (detailConfig.detailMode === "modal") {
      return {
        mode: "modal",
        onOpenDetail: handleModalOpenDetail,
      }
    }

    const listingId = readListingGridPreviewListingId(preview.previewListing)
    if (!listingId) return null

    const link = detailConfig.resolveDetailLink(listingId)
    if (!link) return null

    return {
      mode: "link",
      link,
      onLinkActivate: closePreviewForDetailHandoff,
    }
  }, [
    closePreviewForDetailHandoff,
    detailConfig,
    handleModalOpenDetail,
    preview.previewListing,
  ])

  if (!detailMode) return null

  return (
    <ListingGridPreviewModal
      listing={preview.previewListing}
      onClose={preview.closePreview}
      showBuildingName={showBuildingName}
      skipHistorySyncOnCloseRef={preview.skipHistorySyncOnCloseRef}
      detailMode={detailMode}
    />
  )
}
