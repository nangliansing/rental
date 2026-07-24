import {
  formatCompactMoney,
  getSortedListingPhotos,
} from "@/features/listing/utils/listingDisplay"

import type { SearchSavedListing } from "../api"

export function getLiveSavedListing(savedListing: SearchSavedListing) {
  return savedListing.listing?._id ? savedListing.listing : null
}

export function getSavedListingCover(savedListing: SearchSavedListing) {
  const liveListing = getLiveSavedListing(savedListing)

  if (liveListing) {
    return getSortedListingPhotos(liveListing.media ?? [])[0] ?? null
  }

  return savedListing.snapshot?.coverPhoto ?? null
}

export function getSavedListingTitle(savedListing: SearchSavedListing) {
  const liveListing = getLiveSavedListing(savedListing)

  if (liveListing?.rent != null) {
    return formatCompactMoney(liveListing.rent)
  }

  if (savedListing.snapshot?.rent != null) {
    return formatCompactMoney(savedListing.snapshot.rent)
  }

  return "Saved room"
}

export function getSavedListingBuildingName(savedListing: SearchSavedListing) {
  const liveBuildingName =
    getLiveSavedListing(savedListing)?.building?.name?.trim()
  const snapshotBuildingName = savedListing.snapshot?.buildingName?.trim()

  return liveBuildingName || snapshotBuildingName || "Listing unavailable"
}

export function isSavedListingAvailable(savedListing: SearchSavedListing) {
  return Boolean(getLiveSavedListing(savedListing))
}
