import { AppError } from "../errors/app-error.js";

const validateMaxLength = (max) => {
  if (!Number.isInteger(max) || max < 1) {
    throw new AppError("max must be a positive integer", 500, "INTERNAL_ERROR");
  }
};

export const validateRequiredString = (input, fieldName, max = 255) => {
  validateMaxLength(max);

  if (typeof input !== "string") {
    throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
  }

  const trimmed = input.trim();

  if (!trimmed) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  if (trimmed.length > max) {
    throw new AppError(
      `${fieldName} must be at most ${max} characters`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return trimmed;
};

export const validateOptionalString = (input, fieldName, max = 1000) => {
  validateMaxLength(max);

  if (input == null) return null;

  if (typeof input !== "string") {
    throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
  }

  const trimmed = input.trim();

  if (!trimmed) return null;

  if (trimmed.length > max) {
    throw new AppError(
      `${fieldName} must be at most ${max} characters`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return trimmed;
};