// src/shared/validators/object.validators.js
import { AppError } from "../errors/app-error.js";

export const validateObject = (input, fieldName) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(`${fieldName} must be an object`, 422, "VALIDATION_ERROR");
  }

  return input;
};

export const validateNullableObject = (input, fieldName) => {
  if (input == null) return null;

  return validateObject(input, fieldName);
};