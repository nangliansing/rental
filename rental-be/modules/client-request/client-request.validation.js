import { AppError } from "../../shared/errors/app-error.js";
import {
  validateEnumValue,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validateRequiredString,
} from "../../shared/validators/index.js";

import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
  CLIENT_REQUEST_STATUSES,
} from "./client-request.constants.js";
import {
  validateClientRequestFilters,
  validateClientRequestGeoSearch,
} from "./validation/index.js";

export const validateClientRequestId = (input) => {
  return validateMongooseId(input, "clientRequestId", {
    asObjectId: true,
  });
};

export const validateClientRequestStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(CLIENT_REQUEST_STATUSES),
    null,
  );
};

export const validateCreateClientRequestBody = (input) => {
  validateObject(input, "body");

  if (input.geoSearch == null) {
    throw new AppError("geoSearch is required", 422, "VALIDATION_ERROR");
  }

  return {
    name: validateRequiredString(
      input.name,
      "name",
      CLIENT_REQUEST_NAME_MAX_LENGTH,
    ),
    description: validateOptionalString(
      input.description,
      "description",
      CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
    ),
    geoSearch: validateClientRequestGeoSearch(input.geoSearch),
    filters: validateClientRequestFilters(input.filters ?? {}),
  };
};

export {
  validateClientRequestFilters,
  validateClientRequestGeoSearch,
  validateMapPosition,
} from "./validation/index.js";
