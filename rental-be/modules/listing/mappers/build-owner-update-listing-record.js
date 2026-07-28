// modules/listing/mappers/build-owner-update-listing-record.js
import { isDeepStrictEqual } from "node:util";

import { validateObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import {
  validateVisibility,
  validateIsForeignerAccepted,
  validateIsTM30Provided,
  validateRent,
  validateDeposit,
  validateMoveInCost,
  validateElectricRate,
  validateWaterRate,
  validateBedroomCount,
  validateBathroomCount,
  validateKitchenType,
  validateSize,
  validateContractMonths,
  validateOccupancy,
  validateIsCookingAllowed,
  validateIsPetAllowed,
  validateFacilities,
  validateMedia,
  validateDescription,
  validateAvailableAt,
} from "../listing.validation.js";

const OWNER_UPDATE_FIELD_VALIDATORS = Object.freeze({
  visibility: validateVisibility,
  isForeignerAccepted: validateIsForeignerAccepted,
  isTM30Provided: validateIsTM30Provided,
  rent: validateRent,
  deposit: validateDeposit,
  moveInCost: validateMoveInCost,
  electricRate: validateElectricRate,
  waterRate: validateWaterRate,
  bedroomCount: validateBedroomCount,
  bathroomCount: validateBathroomCount,
  kitchenType: validateKitchenType,
  size: validateSize,
  contractMonths: validateContractMonths,
  occupancy: validateOccupancy,
  isCookingAllowed: validateIsCookingAllowed,
  isPetAllowed: validateIsPetAllowed,
  facilities: validateFacilities,
  media: validateMedia,
  description: validateDescription,
  availableAt: validateAvailableAt,
});

const toPlainValue = (value) => {
  if (value?.toObject) {
    return value.toObject({ depopulate: true });
  }

  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }

  return value;
};

export const buildOwnerUpdateListingRecord = ({ body, listing }) => {
  const validatedBody = validateObject(body, "body");
  const unknownFields = Object.keys(validatedBody).filter(
    (fieldName) => !Object.hasOwn(OWNER_UPDATE_FIELD_VALIDATORS, fieldName),
  );

  if (unknownFields.length) {
    throw new AppError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const update = {};

  for (const [fieldName, input] of Object.entries(validatedBody)) {
    const nextValue = OWNER_UPDATE_FIELD_VALIDATORS[fieldName](input);
    const currentValue = toPlainValue(listing[fieldName]);

    if (!isDeepStrictEqual(nextValue, currentValue)) {
      update[fieldName] = nextValue;
    }
  }

  if (!Object.keys(update).length) {
    throw new AppError("No valid change", 422, "NO_VALID_CHANGE");
  }

  return update;
};
