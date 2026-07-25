// modules/building/building.validation.js
import {
  BUILDING_FACILITIES,
  BUILDING_SECURITY,
  BUILDING_TYPES,
} from "./building.constants.js";

import {
  validateRequiredString,
  validateOptionalString,
  validateBoolean,
  validateLocation,
  validateStringArray,
  validateNullableNumberRange,
  validateEnumValue,
  validateMongooseId,
} from "../../shared/validators/index.js";

import { AppError } from "../../shared/errors/app-error.js";

export const validateName = (input) => {
  return validateRequiredString(input, "name", 255);
};

export const validateIsActive = (input) => {
  return validateBoolean(input, "isActive");
};

export const validateBuildingType = (input) => {
  return validateEnumValue(
    input,
    "buildingType",
    Object.values(BUILDING_TYPES),
    BUILDING_TYPES.APARTMENT
  );
};

export const validateFacilities = (input) => {
  return validateStringArray(
    input,
    "facilities",
    Object.values(BUILDING_FACILITIES)
  );
};

export const validateSecurity = (input) => {
  return validateStringArray(
    input,
    "security",
    Object.values(BUILDING_SECURITY)
  );
};

export const validateBuildingLocation = (input) => {
  return validateLocation(input, "location");
};

export const validateAddress = (input) => {
  return validateOptionalString(input, "address", 500);
};

export const validateMinRent = (input) => {
  return validateNullableNumberRange(
    input,
    "minRent",
    0,
    Number.MAX_SAFE_INTEGER
  );
};

export const validateMaxRent = (input, minRent = null) => {
  const maxRent = validateNullableNumberRange(
    input,
    "maxRent",
    0,
    Number.MAX_SAFE_INTEGER
  );

  if (maxRent != null && minRent != null && maxRent < minRent) {
    throw new AppError(
      "maxRent must be greater than or equal to minRent",
      422,
      "VALIDATION_ERROR"
    );
  }

  return maxRent;
};

export const validateCreatedBy = (input) => {
  return validateMongooseId(input, "createdBy");
};

export const validateUpdatedBy = (input) => {
  if (input == null) return null;

  return validateMongooseId(input, "updatedBy");
};