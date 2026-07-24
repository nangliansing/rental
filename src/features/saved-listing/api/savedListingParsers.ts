import { ApiError } from "@/lib/api-client"

import {
  normalizePositiveInteger,
  parseListingMedia,
  parsePagination,
  parseSearchListing,
  readNullableString,
  readNumber,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"

import type { SavedListing, SavedListingSnapshot } from "./createSavedListing"
import type {
  SavedListingLiveListing,
  SearchSavedListing,
  SearchSavedListingsResponse,
} from "./searchSavedListings"

export { normalizePositiveInteger }

const parseSavedListingSnapshot = (
  value: unknown,
): SavedListingSnapshot => {
  const snapshot = readRecord(value)
  const visibility = readString(snapshot.visibility, "PUBLIC")

  return {
    rent: readNumber(snapshot.rent),
    visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    buildingName: readNullableString(snapshot.buildingName),
    coverPhoto: parseListingMedia(snapshot.coverPhoto),
  }
}

const parseLiveListing = (value: unknown): SavedListingLiveListing | null => {
  if (value === null || value === undefined) return null

  return parseSearchListing(value, {
    errorMessage: "Saved listing response is missing live listing data.",
    errorCode: "INVALID_SAVED_LISTING_RESPONSE",
  })
}

export const parseSavedListing = (value: unknown): SavedListing => {
  const savedListing = readRecord(value)
  const id = readString(savedListing._id)
  const userId = readString(savedListing.userId)
  const listingId = readString(savedListing.listingId)
  const buildingId = readString(savedListing.buildingId)
  const listedBy = readString(savedListing.listedBy)

  if (!id || !userId || !listingId || !buildingId || !listedBy) {
    throw new ApiError(
      "Saved listing response is missing required data.",
      500,
      "INVALID_SAVED_LISTING_RESPONSE",
    )
  }

  return {
    _id: id,
    userId,
    listingId,
    buildingId,
    listedBy,
    snapshot: parseSavedListingSnapshot(savedListing.snapshot),
    createdAt: readString(savedListing.createdAt),
    updatedAt: readString(savedListing.updatedAt),
  }
}

export const parseSavedListingResponse = (value: unknown) => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Saved listing response is missing required data.",
      500,
      "INVALID_SAVED_LISTING_RESPONSE",
    )
  }

  return parseSavedListing(body.data)
}

export const parseSearchSavedListing = (
  value: unknown,
): SearchSavedListing => {
  const savedListing = readRecord(value)
  const id = readString(savedListing._id)
  const listingId = readString(savedListing.listingId)
  const buildingId = readString(savedListing.buildingId)
  const listedBy = readString(savedListing.listedBy)

  if (!id || !listingId || !buildingId || !listedBy) {
    throw new ApiError(
      "Saved listing response is missing required data.",
      500,
      "INVALID_SAVED_LISTING_RESPONSE",
    )
  }

  return {
    _id: id,
    listingId,
    buildingId,
    listedBy,
    snapshot:
      savedListing.snapshot === null || savedListing.snapshot === undefined
        ? null
        : parseSavedListingSnapshot(savedListing.snapshot),
    listing: parseLiveListing(savedListing.listing),
    createdAt: readString(savedListing.createdAt),
    updatedAt: readString(savedListing.updatedAt),
  }
}

export const parseSearchSavedListingsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchSavedListingsResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)
  const savedListings = data.savedListings

  if (body.success !== true || !Array.isArray(savedListings)) {
    throw new ApiError(
      "Saved listings response is missing required data.",
      500,
      "INVALID_SAVED_LISTING_RESPONSE",
    )
  }

  return {
    success: true,
    data: {
      savedListings: savedListings.map(parseSearchSavedListing),
    },
    pagination: parsePagination(body.pagination, fallback),
  }
}
