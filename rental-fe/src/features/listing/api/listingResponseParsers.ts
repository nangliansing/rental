import { ApiError } from "@/lib/api-client"

import type {
  BuildingLocation,
  ListingAgentProfile,
  ListingMedia,
  Pagination,
  SearchListing,
  SearchListingsBuilding,
} from "@/features/map-search/types"
import { parseAvailableAtFromApi } from "../utils/listingAvailability"

export type ListingWithBuilding = SearchListing & {
  building: SearchListingsBuilding
}

export type ListingWithOptionalBuilding = SearchListing & {
  building: SearchListingsBuilding | null
}

export type ParsedOwnerListingAgentProfile = ListingAgentProfile & {
  description: string | null
}

export const readRecord = (value: unknown): Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export const readString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback
}

export const readNullableString = (value: unknown) => {
  return typeof value === "string" ? value : null
}

export const readNumber = (
  value: unknown,
  fallback: number | null = null,
) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export const readBoolean = (value: unknown, fallback = false) => {
  return typeof value === "boolean" ? value : fallback
}

export const readStringArray = (value: unknown) => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

export const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : fallback

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback
}

export const parseListingMedia = (value: unknown): ListingMedia | null => {
  if (value === null || value === undefined) return null

  const media = readRecord(value)
  const publicId = readString(media.publicId)
  const secureUrl = readString(media.secureUrl)

  if (!publicId || !secureUrl) return null

  return {
    publicId,
    secureUrl,
    resourceType: readString(media.resourceType, "image"),
    format: readNullableString(media.format),
    width: readNumber(media.width),
    height: readNumber(media.height),
    bytes: readNumber(media.bytes),
    position: readNumber(media.position, 0) ?? 0,
    alt: readNullableString(media.alt),
    isCover: readBoolean(media.isCover),
  }
}

export const parsePagination = (
  value: unknown,
  fallback: { page: number; limit: number },
): Pagination => {
  const pagination = readRecord(value)

  return {
    page: readNumber(pagination.page, fallback.page) ?? fallback.page,
    limit: readNumber(pagination.limit, fallback.limit) ?? fallback.limit,
    total: readNumber(pagination.total, 0) ?? 0,
  }
}

export const parseBuildingLocation = (value: unknown): BuildingLocation => {
  const location = readRecord(value)
  const coordinates = Array.isArray(location.coordinates)
    ? location.coordinates
    : []
  const lng = readNumber(coordinates[0], 0) ?? 0
  const lat = readNumber(coordinates[1], 0) ?? 0

  return {
    type: "Point",
    coordinates: [lng, lat],
  }
}

export const parseSearchListingsBuilding = (
  value: unknown,
  {
    errorMessage = "Listing response is missing building data.",
    errorCode = "INVALID_LISTING_RESPONSE",
  }: {
    errorMessage?: string
    errorCode?: string
  } = {},
): SearchListingsBuilding => {
  const building = readRecord(value)
  const id = readString(building._id)

  if (!id) {
    throw new ApiError(errorMessage, 500, errorCode)
  }

  return {
    _id: id,
    name: readString(building.name),
    buildingType: readString(building.buildingType),
    facilities: readStringArray(building.facilities),
    security: readStringArray(building.security),
    location: parseBuildingLocation(building.location),
    address: readString(building.address),
    minRent: readNumber(building.minRent),
    maxRent: readNumber(building.maxRent),
    isFollowing: readBoolean(building.isFollowing),
  }
}

export const parseReviewSummary = (
  value: unknown,
): ListingAgentProfile["reviewSummary"] => {
  const summary = readRecord(value)
  const ratingCounts = readRecord(summary.ratingCounts)

  return {
    averageRating: readNumber(summary.averageRating, 0) ?? 0,
    reviewCount: readNumber(summary.reviewCount, 0) ?? 0,
    ratingCounts: {
      oneStar: readNumber(ratingCounts.oneStar, 0) ?? 0,
      twoStars: readNumber(ratingCounts.twoStars, 0) ?? 0,
      threeStars: readNumber(ratingCounts.threeStars, 0) ?? 0,
      fourStars: readNumber(ratingCounts.fourStars, 0) ?? 0,
      fiveStars: readNumber(ratingCounts.fiveStars, 0) ?? 0,
    },
    tagCounts: Array.isArray(summary.tagCounts)
      ? summary.tagCounts
          .map((tagCount) => {
            const tagCountRecord = readRecord(tagCount)
            const tag = readString(tagCountRecord.tag)
            const count = readNumber(tagCountRecord.count, 0) ?? 0

            return tag ? { tag, count } : null
          })
          .filter(
            (
              tagCount,
            ): tagCount is NonNullable<
              ListingAgentProfile["reviewSummary"]
            >["tagCounts"][number] => tagCount !== null,
          )
      : [],
  }
}

export const parseListingAgentProfile = (
  value: unknown,
): ListingAgentProfile | null => {
  if (value === null || value === undefined) return null

  const agentProfile = readRecord(value)
  const id = readString(agentProfile._id)
  const userId = readString(agentProfile.userId)

  if (!id || !userId) return null

  return {
    _id: id,
    userId,
    displayName: readString(agentProfile.displayName),
    profilePhoto: parseListingMedia(agentProfile.profilePhoto),
    phone: readNullableString(agentProfile.phone),
    lineUrl: readNullableString(agentProfile.lineUrl),
    whatsappPhone: readNullableString(agentProfile.whatsappPhone),
    telegramUrl: readNullableString(agentProfile.telegramUrl),
    viberPhone: readNullableString(agentProfile.viberPhone),
    supportLanguages: readStringArray(agentProfile.supportLanguages),
    reviewSummary: parseReviewSummary(agentProfile.reviewSummary),
    isVerified: readBoolean(agentProfile.isVerified),
    isOnline: readBoolean(agentProfile.isOnline),
  }
}

export const parseOwnerListingAgentProfile = (
  value: unknown,
  {
    errorMessage = "Owner listing response has invalid agent profile data.",
    errorCode = "INVALID_OWNER_LISTING_RESPONSE",
  }: {
    errorMessage?: string
    errorCode?: string
  } = {},
): ParsedOwnerListingAgentProfile | null => {
  if (value === null) return null

  const agentProfile = parseListingAgentProfile(value)

  if (!agentProfile) {
    throw new ApiError(errorMessage, 500, errorCode)
  }

  const profile = readRecord(value)

  return {
    ...agentProfile,
    description: readNullableString(profile.description),
  }
}

const parseSearchListingFields = (
  value: unknown,
  {
    errorMessage = "Listing response is missing listing data.",
    errorCode = "INVALID_LISTING_RESPONSE",
  }: {
    errorMessage?: string
    errorCode?: string
  } = {},
): SearchListing => {
  const listing = readRecord(value)
  const id = readString(listing._id)
  const listedBy = readString(listing.listedBy)
  const buildingId = readString(listing.buildingId)

  if (!id || !listedBy || !buildingId) {
    throw new ApiError(errorMessage, 500, errorCode)
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
    availableAt: parseAvailableAtFromApi(listing.availableAt),
    description: readString(listing.description),
    listedBy,
    buildingId,
    createdAt: readString(listing.createdAt),
    updatedAt: readString(listing.updatedAt),
    agentProfile: parseListingAgentProfile(listing.agentProfile),
  }
}

export const parseSearchListing = (
  value: unknown,
  options: {
    errorMessage?: string
    errorCode?: string
  } = {},
): ListingWithBuilding => {
  const listing = readRecord(value)
  const parsedListing = parseSearchListingFields(value, options)

  return {
    ...parsedListing,
    building: parseSearchListingsBuilding(listing.building, options),
  }
}

export const parseOwnerListing = (
  value: unknown,
  options: {
    errorMessage?: string
    errorCode?: string
  } = {},
): ListingWithOptionalBuilding => {
  const listing = readRecord(value)
  const parsedListing = parseSearchListingFields(value, options)

  return {
    ...parsedListing,
    building:
      listing.building === null
        ? null
        : parseSearchListingsBuilding(listing.building, options),
  }
}
