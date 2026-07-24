import { ApiError, apiClient } from "@/lib/api-client"

import type { ListingMedia } from "@/features/map-search/types"
import type { ListingFormValues } from "../components/ListingForm"
import {
  parseListingMedia,
  readRecord,
} from "./listingResponseParsers"

export type UpdateOwnerListingInput = Partial<ListingFormValues>

export type UpdatedOwnerListing = Omit<
  ListingFormValues,
  "media" | "description"
> & {
  _id: string
  media: ListingMedia[]
  description: string | null
  isDeleted: boolean
  deletedAt: string | null
  deletedBy: string | null
  deleteReason: string | null
  listedBy: string
  buildingId: string
  createdAt: string
  updatedAt: string
}

export type UpdateOwnerListingResponse = {
  success: true
  data: UpdatedOwnerListing
}

const INVALID_UPDATE_OWNER_LISTING_RESPONSE =
  "INVALID_UPDATE_OWNER_LISTING_RESPONSE"

const UPDATE_FIELDS = new Set<keyof ListingFormValues>([
  "visibility",
  "isForeignerAccepted",
  "isTM30Provided",
  "rent",
  "deposit",
  "moveInCost",
  "electricRate",
  "waterRate",
  "bedroomCount",
  "bathroomCount",
  "kitchenType",
  "size",
  "contractMonths",
  "occupancy",
  "isCookingAllowed",
  "isPetAllowed",
  "facilities",
  "media",
  "description",
])

const invalidResponse = () =>
  new ApiError(
    "Could not read the updated listing response.",
    500,
    INVALID_UPDATE_OWNER_LISTING_RESPONSE,
  )

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isFiniteNumber(value)

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string"

const parseUpdatedOwnerListing = (value: unknown): UpdatedOwnerListing => {
  const listing = readRecord(value)
  const mediaInput = listing.media
  const media = Array.isArray(mediaInput)
    ? mediaInput.map(parseListingMedia)
    : null

  if (
    typeof listing._id !== "string" ||
    (listing.visibility !== "PUBLIC" && listing.visibility !== "PRIVATE") ||
    typeof listing.isForeignerAccepted !== "boolean" ||
    typeof listing.isTM30Provided !== "boolean" ||
    !isFiniteNumber(listing.rent) ||
    !isFiniteNumber(listing.deposit) ||
    !isFiniteNumber(listing.moveInCost) ||
    !isNullableNumber(listing.electricRate) ||
    !isNullableNumber(listing.waterRate) ||
    !isFiniteNumber(listing.bedroomCount) ||
    !isFiniteNumber(listing.bathroomCount) ||
    typeof listing.kitchenType !== "string" ||
    !isNullableNumber(listing.size) ||
    !isFiniteNumber(listing.contractMonths) ||
    !isFiniteNumber(listing.occupancy) ||
    typeof listing.isCookingAllowed !== "boolean" ||
    typeof listing.isPetAllowed !== "boolean" ||
    !Array.isArray(listing.facilities) ||
    !listing.facilities.every((facility) => typeof facility === "string") ||
    !media ||
    media.some((item) => item === null) ||
    !isNullableString(listing.description) ||
    typeof listing.isDeleted !== "boolean" ||
    !isNullableString(listing.deletedAt) ||
    !isNullableString(listing.deletedBy) ||
    !isNullableString(listing.deleteReason) ||
    typeof listing.listedBy !== "string" ||
    typeof listing.buildingId !== "string" ||
    typeof listing.createdAt !== "string" ||
    typeof listing.updatedAt !== "string"
  ) {
    throw invalidResponse()
  }

  return {
    _id: listing._id,
    visibility: listing.visibility,
    isForeignerAccepted: listing.isForeignerAccepted,
    isTM30Provided: listing.isTM30Provided,
    rent: listing.rent,
    deposit: listing.deposit,
    moveInCost: listing.moveInCost,
    electricRate: listing.electricRate,
    waterRate: listing.waterRate,
    bedroomCount: listing.bedroomCount,
    bathroomCount: listing.bathroomCount,
    kitchenType: listing.kitchenType,
    size: listing.size,
    contractMonths: listing.contractMonths,
    occupancy: listing.occupancy,
    isCookingAllowed: listing.isCookingAllowed,
    isPetAllowed: listing.isPetAllowed,
    facilities: listing.facilities as string[],
    media: media as ListingMedia[],
    description: listing.description,
    isDeleted: listing.isDeleted,
    deletedAt: listing.deletedAt,
    deletedBy: listing.deletedBy,
    deleteReason: listing.deleteReason,
    listedBy: listing.listedBy,
    buildingId: listing.buildingId,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  }
}

export const parseUpdateOwnerListingResponse = (
  value: unknown,
): UpdateOwnerListingResponse => {
  const response = readRecord(value)

  if (response.success !== true) {
    throw invalidResponse()
  }

  return {
    success: true,
    data: parseUpdatedOwnerListing(response.data),
  }
}

const buildUpdateBody = (values: UpdateOwnerListingInput) => {
  const input = readRecord(values)
  const unknownFields = Object.keys(input).filter(
    (fieldName) => !UPDATE_FIELDS.has(fieldName as keyof ListingFormValues),
  )

  if (unknownFields.length) {
    throw new ApiError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    )
  }

  const body = Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([fieldName, value]) => [
        fieldName,
        fieldName === "description" && typeof value === "string"
          ? value.trim() || null
          : value,
      ]),
  )

  if (!Object.keys(body).length) {
    throw new ApiError(
      "Change at least one listing detail first.",
      422,
      "NO_VALID_CHANGE",
    )
  }

  return body
}

export async function updateOwnerListing(
  listingId: string,
  values: UpdateOwnerListingInput,
) {
  const normalizedListingId = listingId.trim()

  if (!normalizedListingId) {
    throw new ApiError(
      "Listing id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.patch<unknown>(
    `/listings/${encodeURIComponent(normalizedListingId)}`,
    buildUpdateBody(values),
  )

  return parseUpdateOwnerListingResponse(response.data).data
}
