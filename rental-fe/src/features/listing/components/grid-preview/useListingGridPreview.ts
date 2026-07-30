import { useCallback, useRef, useState } from "react"

import type { ListingGridCardListing } from "../listingGridCardTypes"

type PreviewState = {
  listing: ListingGridCardListing
}

type ClosePreviewOptions = {
  handoffToDetail?: boolean
}

function hasListingId(listing: ListingGridCardListing) {
  return typeof listing._id === "string" && listing._id.trim().length > 0
}

export function useListingGridPreview() {
  const [state, setState] = useState<PreviewState | null>(null)
  const skipHistorySyncOnCloseRef = useRef(false)

  const openPreview = useCallback((listing: ListingGridCardListing) => {
    skipHistorySyncOnCloseRef.current = false
    if (!hasListingId(listing)) return
    setState({ listing })
  }, [])

  const closePreview = useCallback((options?: ClosePreviewOptions) => {
    skipHistorySyncOnCloseRef.current = options?.handoffToDetail ?? false
    setState(null)
  }, [])

  return {
    previewListing: state?.listing ?? null,
    isPreviewOpen: state != null,
    openPreview,
    closePreview,
    skipHistorySyncOnCloseRef,
  }
}
