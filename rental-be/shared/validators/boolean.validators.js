import { AppError } from "../errors/app-error.js";

export const validateBoolean = (input, fieldName) => {
  if (typeof input !== "boolean") {
    throw new AppError(`${fieldName} must be a boolean`, 422, "VALIDATION_ERROR");
  }

  return input;
};

export const validateNullableBoolean = (input, fieldName) => {
  if (input == null) return null;

  return validateBoolean(input, fieldName);
};