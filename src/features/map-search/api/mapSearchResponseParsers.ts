import { ApiError } from "@/lib/api-client"

import {
  parseBuildingLocation,
  parseListingAgentProfile,
  parseListingMedia,
  parsePagination,
  parseSearchListingsBuilding,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"

import type {
  BuildingListing,
  SearchBuilding,
  SearchBuildingsInMapResponse,
  SearchBuildingsNearLinesResponse,
  SearchBuildingsNearbyResponse,
  SearchListing,
  SearchListingsInBuildingResponse,
} from "../types"

const INVALID_MAP_SEARCH_RESPONSE = "INVALID_MAP_SEARCH_RESPONSE"
const INVALID_LISTINGS_IN_BUILDING_RESPONSE =
  "INVALID_LISTINGS_IN_BUILDING_RESPONSE"

const parseBuildingListing = (value: unknown): BuildingListing => {
  const listing = readRecord(value)
  const id = readString(listing._id)

  if (!id) {
    throw new ApiError(
      "Map search response is missing listing data.",
      500,
      INVALID_MAP_SEARCH_RESPONSE,
    )
  }

  return {
    _id: id,
    rent: readNumber(listing.rent, 0) ?? 0,
    deposit: readNumber(listing.deposit, 0) ?? 0,
    moveInCost: readNumber(listing.moveInCost, 0) ?? 0,
    electricRate: readNumber(listing.electricRate),
    waterRate: readNumber(listing.waterRate),
    bedroomCount: readNumber(listing.bedroomCount, 0) ?? 0,
    bathroomCount: readNumber(listing.bathroomCount, 0) ?? 0,
    kitchenType: readString(listing.kitchenType),
    size: readNumber(listing.size, 0) ?? 0,
    contractMonths: readNumber(listing.contractMonths, 0) ?? 0,
    occupancy: readNumber(listing.occupancy, 0) ?? 0,
    isCookingAllowed: readBoolean(listing.isCookingAllowed),
    isPetAllowed: readBoolean(listing.isPetAllowed),
    facilities: readStringArray(listing.facilities),
    media: Array.isArray(listing.media)
      ? listing.media.flatMap((media) => {
          const parsedMedia = parseListingMedia(media)

          return parsedMedia ? [parsedMedia] : []
        })
      : [],
    isSavedByMe: readBoolean(listing.isSavedByMe),
    updatedAt: readString(listing.updatedAt),
  }
}

export const parseSearchBuilding = (value: unknown): SearchBuilding => {
  const building = readRecord(value)
  const id = readString(building._id)

  if (!id) {
    throw new ApiError(
      "Map search response is missing building data.",
      500,
      INVALID_MAP_SEARCH_RESPONSE,
    )
  }

  return {
    _id: id,
    distanceMeters: readNumber(building.distanceMeters) ?? undefined,
    name: readString(building.name),
    buildingType: readString(building.buildingType),
    facilities: readStringArray(building.facilities),
    security: readStringArray(building.security),
    location: parseBuildingLocation(building.location),
    address: readNullableString(building.address) ?? "",
    minRent: readNumber(building.minRent),
    maxRent: readNumber(building.maxRent),
    listings: Array.isArray(building.listings)
      ? building.listings.map(parseBuildingListing)
      : [],
  }
}

export const parseSearchBuildingsInMapResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchBuildingsInMapResponse => {
  const response = readRecord(value)

  return {
    success: true,
    data: Array.isArray(response.data)
      ? response.data.map(parseSearchBuilding)
      : [],
    pagination: parsePagination(response.pagination, fallback),
  }
}

export const parseSearchBuildingsNearLinesResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchBuildingsNearLinesResponse =>
  parseSearchBuildingsInMapResponse(value, fallback)

export const parseSearchBuildingsNearbyResponse = (
  value: unknown,
): SearchBuildingsNearbyResponse => {
  const response = readRecord(value)

  return {
    success: true,
    data: Array.isArray(response.data)
      ? response.data.map(parseSearchBuilding)
      : [],
  }
}

const parseListingInBuilding = (value: unknown): SearchListing => {
  const listing = readRecord(value)
  const id = readString(listing._id)
  const listedBy = readString(listing.listedBy)
  const buildingId = readString(listing.buildingId)

  if (!id || !listedBy || !buildingId) {
    throw new ApiError(
      "Search listings in building response is missing listing data.",
      500,
      INVALID_LISTINGS_IN_BUILDING_RESPONSE,
    )
  }

  const visibility = readString(listing.visibility, "PUBLIC")

  return {
    _id: id,
    visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    isDeleted: readBoolean(listing.isDeleted),
    isForeignerAccepted: readBoolean(listing.isForeignerAccepted),
    isTM30Provided: readBoolean(listing.isTM30Provided),
    rent: readNumber(listing.rent, 0) ?? 0,
    deposit: readNumber(listing.deposit, 0) ?? 0,
    moveInCost: readNumber(listing.moveInCost, 0) ?? 0,
    electricRate: readNumber(listing.electricRate),
    waterRate: readNumber(listing.waterRate),
    bedroomCount: readNumber(listing.bedroomCount, 0) ?? 0,
    bathroomCount: readNumber(listing.bathroomCount, 0) ?? 0,
    kitchenType: readString(listing.kitchenType),
    size: readNumber(listing.size, 0) ?? 0,
    contractMonths: readNumber(listing.contractMonths, 0) ?? 0,
    occupancy: readNumber(listing.occupancy, 0) ?? 0,
    isCookingAllowed: readBoolean(listing.isCookingAllowed),
    isPetAllowed: readBoolean(listing.isPetAllowed),
    facilities: readStringArray(listing.facilities),
    media: Array.isArray(listing.media)
      ? listing.media.flatMap((media) => {
          const parsedMedia = parseListingMedia(media)

          return parsedMedia ? [parsedMedia] : []
        })
      : [],
    isSavedByMe: readBoolean(listing.isSavedByMe),
    description: readString(listing.description),
    listedBy,
    buildingId,
    createdAt: readString(listing.createdAt),
    updatedAt: readString(listing.updatedAt),
    agentProfile: parseListingAgentProfile(listing.agentProfile),
  }
}

export const parseSearchListingsInBuildingResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchListingsInBuildingResponse => {
  const response = readRecord(value)
  const data = readRecord(response.data)

  return {
    success: true,
    data: {
      building: parseSearchListingsBuilding(data.building, {
        errorMessage:
          "Search listings in building response is missing building data.",
        errorCode: INVALID_LISTINGS_IN_BUILDING_RESPONSE,
      }),
      listings: Array.isArray(data.listings)
        ? data.listings.map(parseListingInBuilding)
        : [],
    },
    pagination: parsePagination(response.pagination, fallback),
  }
}
