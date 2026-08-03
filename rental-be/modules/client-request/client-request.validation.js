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

export const validateOwnerUpdateClientRequestStatusBody = (input) => {
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

  const status = validateClientRequestStatus(validatedBody.status);

  if (status !== CLIENT_REQUEST_STATUSES.CLOSED) {
    throw new AppError(
      "status must be Closed",
      422,
      "VALIDATION_ERROR",
    );
  }

  return { status };
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
