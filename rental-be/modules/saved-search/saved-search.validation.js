import { AppError } from "../../shared/errors/app-error.js";
import {
  validateEnumValue,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validateRequiredString,
} from "../../shared/validators/index.js";

import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  SAVED_SEARCH_STATUSES,
} from "./saved-search.constants.js";
import {
  validateSavedSearchFilters,
  validateSavedSearchGeoSearch,
} from "./validation/index.js";

export const validateSavedSearchId = (input) => {
  return validateMongooseId(input, "savedSearchId", {
    asObjectId: true,
  });
};

export const validateSavedSearchStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(SAVED_SEARCH_STATUSES),
    null,
  );
};

export const validateOwnerUpdateSavedSearchStatusBody = (input) => {
  const validatedBody = validateObject(input, "body");
  const unknownFields = Object.keys(validatedBody).filter(
    (fieldName) => fieldName !== "status",
  );

  if (unknownFields.length) {
    throw new AppError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (validatedBody.status == null) {
    throw new AppError("status is required", 422, "VALIDATION_ERROR");
  }

  const status = validateSavedSearchStatus(validatedBody.status);

  if (status !== SAVED_SEARCH_STATUSES.CLOSED) {
    throw new AppError(
      "status must be Closed",
      422,
      "VALIDATION_ERROR",
    );
  }

  return { status };
};

export const validateCreateSavedSearchBody = (input) => {
  validateObject(input, "body");

  if (input.geoSearch == null) {
    throw new AppError("geoSearch is required", 422, "VALIDATION_ERROR");
  }

  return {
    name: validateRequiredString(
      input.name,
      "name",
      SAVED_SEARCH_NAME_MAX_LENGTH,
    ),
    description: validateOptionalString(
      input.description,
      "description",
      SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
    ),
    geoSearch: validateSavedSearchGeoSearch(input.geoSearch),
    filters: validateSavedSearchFilters(input.filters ?? {}),
  };
};

export {
  validateSavedSearchFilters,
  validateSavedSearchGeoSearch,
  validateMapPosition,
} from "./validation/index.js";
