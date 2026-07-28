// modules/listing/listing.validation.js
import {
  validateRequiredString,
  validateOptionalString,
  validateBoolean,
  validateNumberRange,
  validateNullableNumberRange,
  validateStringArray,
  validateEnumValue,
  validateMongooseId,
  validateMediaArray,
  validateIntegerRange,
  validateNullableDateAtStartOfDay,
} from "../../shared/validators/index.js";

import { AppError } from "../../shared/errors/app-error.js";

import {
  KITCHEN_TYPES,
  LISTING_FACILITIES,
  LISTING_VISIBILITIES,
  OWNER_LISTING_SORTS,
  OWNER_LISTING_VISIBILITY_FILTERS,
} from "./listing.constants.js";

export const validateVisibility = (input) => {
  return validateEnumValue(
    input,
    "visibility",
    Object.values(LISTING_VISIBILITIES),
    LISTING_VISIBILITIES.PUBLIC
  );
};

export const validateOwnerListingVisibilityFilter = (input) => {
  if (input == null) return OWNER_LISTING_VISIBILITY_FILTERS.ALL;

  if (typeof input !== "string") {
    throw new AppError("visibility must be a string", 422, "VALIDATION_ERROR");
  }

  const normalized = input.trim().toUpperCase();

  return validateEnumValue(
    normalized,
    "visibility",
    Object.values(OWNER_LISTING_VISIBILITY_FILTERS),
    OWNER_LISTING_VISIBILITY_FILTERS.ALL
  );
};

export const validateOwnerListingSort = (input) => {
  if (input == null) return OWNER_LISTING_SORTS.LATEST;

  if (typeof input !== "string") {
    throw new AppError("sort must be a string", 422, "VALIDATION_ERROR");
  }

  const normalized = input.trim().toLowerCase();

  return validateEnumValue(
    normalized,
    "sort",
    Object.values(OWNER_LISTING_SORTS),
    OWNER_LISTING_SORTS.LATEST
  );
};

export const validateIsDeleted = (input) => {
  if (input == null) return false;

  return validateBoolean(input, "isDeleted");
};

export const validateDeletedAt = (input) => {
  if (input == null) return null;

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("deletedAt must be a valid date", 422, "VALIDATION_ERROR");
  }

  return date;
};

export const validateDeletedBy = (input) => {
  if (input == null) return null;

  return validateMongooseId(input, "deletedBy");
};

export const validateDeleteReason = (input) => {
  return validateRequiredString(input, "reason", 500);
};

export const validateIsForeignerAccepted = (input) => {
  return validateBoolean(input, "isForeignerAccepted");
};

export const validateIsTM30Provided = (input) => {
  return validateBoolean(input, "isTM30Provided");
};

export const validateRent = (input) => {
  return validateNumberRange(input, "rent", 0, Number.MAX_SAFE_INTEGER);
};

export const validateDeposit = (input) => {
  return validateNumberRange(input, "deposit", 0, Number.MAX_SAFE_INTEGER);
};

export const validateMoveInCost = (input) => {
  return validateNumberRange(input, "moveInCost", 0, Number.MAX_SAFE_INTEGER);
};

export const validateElectricRate = (input) => {
  return validateNullableNumberRange(input, "electricRate", 0, 50);
};

export const validateWaterRate = (input) => {
  return validateNullableNumberRange(input, "waterRate", 0, 100);
};

export const validateBedroomCount = (input) => {
  return validateIntegerRange(input, "bedroomCount", 0, 20);
};

export const validateBathroomCount = (input) => {
  return validateIntegerRange(input, "bathroomCount", 0, 20);
};

export const validateKitchenType = (input) => {
  return validateEnumValue(
    input,
    "kitchenType",
    Object.values(KITCHEN_TYPES),
    KITCHEN_TYPES.NO_KITCHEN
  );
};

export const validateSize = (input) => {
  return validateNullableNumberRange(input, "size", 0, Number.MAX_SAFE_INTEGER);
};

export const validateContractMonths = (input) => {
  return validateNumberRange(input, "contractMonths", 1, 60);
};

export const validateOccupancy = (input) => {
  return validateNumberRange(input, "occupancy", 1, 50);
};

export const validateIsCookingAllowed = (input) => {
  return validateBoolean(input, "isCookingAllowed");
};

export const validateIsPetAllowed = (input) => {
  return validateBoolean(input, "isPetAllowed");
};

export const validateFacilities = (input) => {
  return validateStringArray(
    input,
    "facilities",
    Object.values(LISTING_FACILITIES)
  );
};

export const validateMedia = (input) => {
  return validateMediaArray(input, "media", 20);
};

export const validateDescription = (input) => {
  return validateOptionalString(input, "description", 3000);
};

export const validateAvailableAt = (input) => {
  return validateNullableDateAtStartOfDay(input, "availableAt");
};

export const validateAvailableBy = (input) => {
  return validateNullableDateAtStartOfDay(input, "availableBy");
};

export const validateListedBy = (input) => {
  return validateMongooseId(input, "listedBy");
};

export const validateBuildingId = (input) => {
  return validateMongooseId(input, "buildingId");
};
