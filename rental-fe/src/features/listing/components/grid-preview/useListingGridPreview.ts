import { useCallback, useState } from "react"

import type { ListingGridCardListing } from "../listingGridCardTypes"

type PreviewState = {
  listing: ListingGridCardListing
}

function hasListingId(listing: ListingGridCardListing) {
  return typeof listing._id === "string" && listing._id.trim().length > 0
}

export function useListingGridPreview() {
  const [state, setState] = useState<PreviewState | null>(null)

  const openPreview = useCallback((listing: ListingGridCardListing) => {
    if (!hasListingId(listing)) return
    setState({ listing })
  }, [])

  const closePreview = useCallback(() => {
    setState(null)
  }, [])

  return {
    previewListing: state?.listing ?? null,
    isPreviewOpen: state != null,
    openPreview,
    closePreview,
  }
}
