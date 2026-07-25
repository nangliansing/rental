import { AppError } from "../errors/app-error.js";

export const validateEnumValue = (
  input,
  fieldName,
  allowedValues,
  defaultValue = null
) => {
  if (input == null) return defaultValue;

  if (!(allowedValues instanceof Set) && !Array.isArray(allowedValues)) {
    throw new AppError("allowedValues must be an array or Set", 500, "INTERNAL_ERROR");
  }

  if (typeof input !== "string") {
    throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
  }

  const trimmed = input.trim();
  const allowedSet = allowedValues instanceof Set ? allowedValues : new Set(allowedValues);

  if (!allowedSet.has(trimmed)) {
    throw new AppError(`Invalid ${fieldName}: ${trimmed}`, 422, "VALIDATION_ERROR");
  }

  return trimmed;
};