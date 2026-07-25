import {
  validateEnumValue,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validateRequiredString,
} from "../../shared/validators/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "./building-edit-request.constants.js";

export const validateBuildingEditRequestId = (input) => {
  return validateMongooseId(input, "buildingEditRequestId", {
    asObjectId: true,
  });
};

export const validateBuildingEditRequestStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(BUILDING_EDIT_REQUEST_STATUSES),
    null,
  );
};

export const validateApproveBuildingEditRequestBody = (input) => {
  validateObject(input, "body");

  return {
    reviewReason:
      validateOptionalString(input.reviewReason, "reviewReason", 1000) ??
      "Approved",
  };
};

export const validateRejectBuildingEditRequestBody = (input) => {
  validateObject(input, "body");

  if (input.reviewReason == null) {
    throw new AppError(
      "reviewReason is required",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    reviewReason: validateRequiredString(
      input.reviewReason,
      "reviewReason",
      1000,
    ),
  };
};
