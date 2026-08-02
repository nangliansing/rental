import { AppError } from "../../shared/errors/app-error.js";
import { PENDING_POST_STATUSES } from "./pending-post.constants.js";
import {
  validateEnumValue,
  validateMongooseId,
  validateObject,
  validateRequiredString,
} from "../../shared/validators/index.js";
import {
  validateAddress,
  validateBuildingLocation,
  validateBuildingType,
  validateFacilities as validateBuildingFacilities,
  validateName,
  validateSecurity,
} from "../building/building.validation.js";
import {
  validateBathroomCount,
  validateBedroomCount,
  validateContractMonths,
  validateDeposit,
  validateDescription,
  validatePrivateNote,
  validateElectricRate,
  validateFacilities as validateListingFacilities,
  validateIsCookingAllowed,
  validateIsForeignerAccepted,
  validateIsPetAllowed,
  validateIsTM30Provided,
  validateKitchenType,
  validateMedia,
  validateMoveInCost,
  validateOccupancy,
  validateRent,
  validateSize,
  validateVisibility,
  validateWaterRate,
  validateAvailableAt,
} from "../listing/listing.validation.js";

export const validateSubmittedBy = (input) => {
  return validateMongooseId(input, "submittedBy");
};

export const validateExistingBuildingId = (input) => {
  if (input == null) return null;

  return validateMongooseId(input, "existingBuildingId");
};

export const validatePendingBuilding = (input) => {
  if (input == null) return null;

  validateObject(input, "building");

  return {
    name: validateName(input.name),
    buildingType: validateBuildingType(input.buildingType),
    facilities: validateBuildingFacilities(input.facilities),
    security: validateSecurity(input.security),
    location: validateBuildingLocation(input.location),
    address: validateAddress(input.address),
  };
};

export const validatePendingListing = (input) => {
  validateObject(input, "listing");

  const media = validateMedia(input.media);

  if (media.length === 0) {
    throw new AppError(
      "At least one listing photo is required",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    visibility: validateVisibility(input.visibility),
    isForeignerAccepted: validateIsForeignerAccepted(input.isForeignerAccepted),
    isTM30Provided: validateIsTM30Provided(input.isTM30Provided),
    rent: validateRent(input.rent),
    deposit: validateDeposit(input.deposit),
    moveInCost: validateMoveInCost(input.moveInCost),
    electricRate: validateElectricRate(input.electricRate),
    waterRate: validateWaterRate(input.waterRate),
    bedroomCount: validateBedroomCount(input.bedroomCount),
    bathroomCount: validateBathroomCount(input.bathroomCount),
    kitchenType: validateKitchenType(input.kitchenType),
    size: validateSize(input.size),
    contractMonths: validateContractMonths(input.contractMonths),
    occupancy: validateOccupancy(input.occupancy),
    isCookingAllowed: validateIsCookingAllowed(input.isCookingAllowed),
    isPetAllowed: validateIsPetAllowed(input.isPetAllowed),
    facilities: validateListingFacilities(input.facilities),
    media,
    description: validateDescription(input.description),
    privateNote: validatePrivateNote(input.privateNote),
    availableAt: validateAvailableAt(input.availableAt),
  };
};

export const validatePendingPostBuildingSource = ({
  existingBuildingId,
  building,
}) => {
  const hasExistingBuilding = existingBuildingId != null;
  const hasBuildingSnapshot = building != null;

  if (hasExistingBuilding === hasBuildingSnapshot) {
    throw new AppError(
      "Pending post must reference an existing building or include a new building, but not both",
      422,
      "VALIDATION_ERROR",
    );
  }
};

export const validatePendingPostStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(PENDING_POST_STATUSES),
    null,
  );
};

export const validateAdminPendingPostStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(PENDING_POST_STATUSES),
    PENDING_POST_STATUSES.PENDING,
  );
};

export const validatePendingPostReviewReason = (input) => {
  return validateRequiredString(input, "reason", 1000);
};
