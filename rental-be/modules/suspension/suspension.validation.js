import {
  validateEnumValue,
  validateLimit,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validatePage,
  validateRequiredString,
} from "../../shared/validators/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { SUSPENSION_STATUSES } from "./suspension.constants.js";

const validateDate = (input, fieldName, { required = true } = {}) => {
  if (input == null) {
    if (!required) return null;

    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      `${fieldName} must be a valid date`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return date;
};

export const validateSuspensionId = (input) => {
  return validateMongooseId(input, "suspensionId", {
    asObjectId: true,
  });
};

export const validateCreateSuspensionBody = (
  input,
  { now = new Date() } = {},
) => {
  validateObject(input, "body");

  const startsAt = validateDate(input.startsAt, "startsAt", {
    required: false,
  }) ?? now;
  const expiresAt = validateDate(input.expiresAt, "expiresAt");

  if (expiresAt <= startsAt) {
    throw new AppError(
      "expiresAt must be after startsAt",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (expiresAt <= now) {
    throw new AppError(
      "expiresAt must be in the future",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    userId: validateMongooseId(input.userId, "userId", { asObjectId: true }),
    reason: validateRequiredString(input.reason, "reason", 500),
    note: validateOptionalString(input.note, "note", 1000),
    startsAt,
    expiresAt,
  };
};

export const validateLiftSuspensionBody = (input) => {
  validateObject(input, "body");

  return {
    liftReason: validateRequiredString(input.liftReason, "liftReason", 1000),
  };
};

export const validateSearchSuspensionsQuery = (input) => {
  validateObject(input, "query");

  const status = validateEnumValue(
    input.status ?? "all",
    "status",
    ["all", ...Object.values(SUSPENSION_STATUSES)],
    null,
  );

  return {
    status: status === "all" ? null : status,
    page: validatePage(input.page),
    limit: validateLimit(input.limit),
  };
};
