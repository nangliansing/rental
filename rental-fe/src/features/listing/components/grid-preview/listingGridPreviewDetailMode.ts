import type { ListingGridCardListing } from "../listingGridCardTypes"

export type ListingGridPreviewDetailLink = {
  to: string
  state?: unknown
}

/** Opens an in-panel listing detail modal from the preview card. */
export type ListingGridPreviewModalDetailMode = {
  mode: "modal"
  onOpenDetail: (listingId: string) => void
}

/** Navigates to a standalone listing detail route from the preview card. */
export type ListingGridPreviewLinkDetailMode = {
  mode: "link"
  link: ListingGridPreviewDetailLink
  onLinkActivate?: () => void
}

export type ListingGridPreviewDetailMode =
  | ListingGridPreviewModalDetailMode
  | ListingGridPreviewLinkDetailMode

export type ListingGridPreviewPortalModalConfig = {
  detailMode: "modal"
  onOpenDetail: (listingId: string) => void
}

export type ListingGridPreviewPortalLinkConfig = {
  detailMode: "link"
  resolveDetailLink: (listingId: string) => ListingGridPreviewDetailLink | null
}

export type ListingGridPreviewPortalDetailConfig =
  | ListingGridPreviewPortalModalConfig
  | ListingGridPreviewPortalLinkConfig

export function readListingGridPreviewListingId(
  listing: ListingGridCardListing,
): string {
  return typeof listing._id === "string" ? listing._id.trim() : ""
}

export function isListingGridPreviewModalDetailMode(
  detailMode: ListingGridPreviewDetailMode,
): detailMode is ListingGridPreviewModalDetailMode {
  return detailMode.mode === "modal"
}

export function isListingGridPreviewLinkDetailMode(
  detailMode: ListingGridPreviewDetailMode,
): detailMode is ListingGridPreviewLinkDetailMode {
  return detailMode.mode === "link"
}
