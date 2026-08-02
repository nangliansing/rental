import { ApiError, apiClient } from "@/lib/api-client";

import type { BuildingFormValues } from "@/features/listing/components/BuildingForm";
import type { ListingFormValues } from "@/features/listing/components/ListingForm";
import {
  parseListingAvailabilityFromApi,
  serializeListingAvailabilityForApi,
} from "@/features/listing/utils/listingAvailability";
import type { UploadedMedia } from "@/features/uploads";

export type PendingPostStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED";

export type PendingPostBuildingSnapshot = BuildingFormValues & {
  location: {
    type: "Point";
    coordinates: [number, number];
  };
};

export type PendingPostExistingBuilding = PendingPostBuildingSnapshot & {
  _id: string;
  isActive: boolean;
  minRent: number | null;
  maxRent: number | null;
};

export type CreatePendingPostWithExistingBuildingInput = {
  existingBuildingId: string;
  listing: ListingFormValues;
};

export type CreatePendingPostWithNewBuildingInput = {
  building: PendingPostBuildingSnapshot;
  listing: ListingFormValues;
};

export type CreatePendingPostInput =
  | CreatePendingPostWithExistingBuildingInput
  | CreatePendingPostWithNewBuildingInput;

export type PendingPost = {
  _id: string;
  status: PendingPostStatus;
  submittedBy: string;
  existingBuildingId: string | null;
  existingBuilding?: PendingPostExistingBuilding;
  building: PendingPostBuildingSnapshot | null;
  listing: ListingFormValues;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBuildingId: string | null;
  approvedListingId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreatePendingPostResponse = {
  success: true;
  data: PendingPost;
};

type CreatePendingPostListingPayload = Omit<
  ListingFormValues,
  "availabilityMode" | "availableFromDate"
> & {
  availableAt: string | null;
};

type CreatePendingPostPayload =
  | {
      existingBuildingId: string;
      listing: CreatePendingPostListingPayload;
    }
  | {
      building: PendingPostBuildingSnapshot;
      listing: CreatePendingPostListingPayload;
    };

const PENDING_POST_STATUSES = new Set<PendingPostStatus>([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELED",
]);

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const readRecord = (
  value: unknown,
  key: string,
): Record<string, unknown> => {
  if (!isRecord(value)) return {};

  const child = value[key];

  return isRecord(child) ? child : {};
};

export const readString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback;
};

export const readNullableString = (value: unknown) => {
  return typeof value === "string" ? value : null;
};

export const readBoolean = (value: unknown, fallback = false) => {
  return typeof value === "boolean" ? value : fallback;
};

export const readNumber = (value: unknown, fallback = 0) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

export const readNullableNumber = (value: unknown) => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const readStringArray = (value: unknown) => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

export const parseUploadedMedia = (value: unknown): UploadedMedia | null => {
  if (!isRecord(value)) return null;

  const publicId = readString(value.publicId);
  const secureUrl = readString(value.secureUrl);

  if (!publicId || !secureUrl) return null;

  return {
    publicId,
    secureUrl,
    resourceType: readString(value.resourceType, "image"),
    format: readNullableString(value.format),
    width: readNullableNumber(value.width),
    height: readNullableNumber(value.height),
    bytes: readNullableNumber(value.bytes),
    position: readNumber(value.position),
    alt: readNullableString(value.alt),
    isCover: readBoolean(value.isCover),
  };
};

const parseMediaArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const media = parseUploadedMedia(item);

    return media ? [media] : [];
  });
};

const parseCoordinates = (value: unknown): [number, number] => {
  if (!Array.isArray(value)) return [0, 0];

  const [lng, lat] = value;

  return [readNumber(lng), readNumber(lat)];
};

const parseLocation = (value: unknown): PendingPostBuildingSnapshot["location"] => {
  const location = isRecord(value) ? value : {};

  return {
    type: "Point",
    coordinates: parseCoordinates(location.coordinates),
  };
};

export const parseBuildingSnapshot = (
  value: unknown,
): PendingPostBuildingSnapshot | null => {
  if (!isRecord(value)) return null;

  return {
    name: readString(value.name),
    buildingType: readString(value.buildingType),
    facilities: readStringArray(value.facilities),
    security: readStringArray(value.security),
    location: parseLocation(value.location),
    address: readString(value.address),
  };
};

export const parseExistingBuilding = (
  value: unknown,
): PendingPostExistingBuilding | undefined => {
  const building = parseBuildingSnapshot(value);

  if (!building || !isRecord(value)) return undefined;

  const id = readString(value._id);

  if (!id) return undefined;

  return {
    ...building,
    _id: id,
    isActive: readBoolean(value.isActive, true),
    minRent: readNullableNumber(value.minRent),
    maxRent: readNullableNumber(value.maxRent),
  };
};

export const parseListing = (value: unknown): ListingFormValues => {
  const listing = isRecord(value) ? value : {};

  return {
    visibility: readString(listing.visibility, "PUBLIC") as ListingFormValues["visibility"],
    isForeignerAccepted: readBoolean(listing.isForeignerAccepted),
    isTM30Provided: readBoolean(listing.isTM30Provided),
    rent: readNumber(listing.rent),
    deposit: readNumber(listing.deposit),
    moveInCost: readNumber(listing.moveInCost),
    electricRate: readNullableNumber(listing.electricRate),
    waterRate: readNullableNumber(listing.waterRate),
    bedroomCount: readNumber(listing.bedroomCount),
    bathroomCount: readNumber(listing.bathroomCount),
    kitchenType: readString(listing.kitchenType),
    size: readNullableNumber(listing.size),
    contractMonths: readNumber(listing.contractMonths),
    occupancy: readNumber(listing.occupancy),
    isCookingAllowed: readBoolean(listing.isCookingAllowed),
    isPetAllowed: readBoolean(listing.isPetAllowed),
    facilities: readStringArray(listing.facilities),
    media: parseMediaArray(listing.media),
    description: readString(listing.description),
    privateNote: readString(listing.privateNote),
    ...parseListingAvailabilityFromApi(listing.availableAt),
  };
};

export const parsePendingPostStatus = (value: unknown): PendingPostStatus => {
  if (typeof value === "string" && PENDING_POST_STATUSES.has(value as PendingPostStatus)) {
    return value as PendingPostStatus;
  }

  return "PENDING";
};

export const parsePendingPost = (value: unknown): PendingPost => {
  const pendingPost = isRecord(value) ? value : {};
  const id = readString(pendingPost._id);
  const submittedBy = readString(pendingPost.submittedBy);

  if (!id || !submittedBy) {
    throw new ApiError(
      "Pending post response is missing required data.",
      500,
      "INVALID_PENDING_POST_RESPONSE",
    );
  }

  return {
    _id: id,
    status: parsePendingPostStatus(pendingPost.status),
    submittedBy,
    existingBuildingId: readNullableString(pendingPost.existingBuildingId),
    existingBuilding: parseExistingBuilding(pendingPost.existingBuilding),
    building: parseBuildingSnapshot(pendingPost.building),
    listing: parseListing(pendingPost.listing),
    reviewNote: readNullableString(pendingPost.reviewNote),
    reviewedBy: readNullableString(pendingPost.reviewedBy),
    reviewedAt: readNullableString(pendingPost.reviewedAt),
    approvedBuildingId: readNullableString(pendingPost.approvedBuildingId),
    approvedListingId: readNullableString(pendingPost.approvedListingId),
    isDeleted: readBoolean(pendingPost.isDeleted),
    createdAt: readString(pendingPost.createdAt),
    updatedAt: readString(pendingPost.updatedAt),
  };
};

export const parseCreatePendingPostResponse = (value: unknown) => {
  return parsePendingPost(readRecord(value, "data"));
};

export const buildPendingPostListingApiPayload = (
  listing: ListingFormValues,
): CreatePendingPostListingPayload => {
  const { availabilityMode, availableFromDate, ...listingFields } = listing;

  return {
    ...listingFields,
    availableAt: serializeListingAvailabilityForApi({
      availabilityMode,
      availableFromDate,
    }),
  };
};

const buildBuildingPayload = (
  building: PendingPostBuildingSnapshot,
): PendingPostBuildingSnapshot => {
  return {
    name: building.name,
    buildingType: building.buildingType,
    facilities: building.facilities,
    security: building.security,
    location: {
      type: "Point",
      coordinates: building.location.coordinates,
    },
    address: building.address,
  };
};

const buildCreatePendingPostPayload = (
  input: CreatePendingPostInput,
): CreatePendingPostPayload => {
  const listing = buildPendingPostListingApiPayload(input.listing);

  if ("existingBuildingId" in input) {
    return {
      existingBuildingId: input.existingBuildingId,
      listing,
    };
  }

  return {
    building: buildBuildingPayload(input.building),
    listing,
  };
};

export async function createPendingPost(input: CreatePendingPostInput) {
  const response = await apiClient.post<CreatePendingPostResponse>(
    "/pending-posts",
    buildCreatePendingPostPayload(input),
  );

  return parseCreatePendingPostResponse(response.data);
}
