import { AppError } from "../errors/app-error.js";

const validateRangeConfig = (min, max) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new AppError(
      "min and max must be valid numbers, and min must be <= max",
      500,
      "INTERNAL_ERROR"
    );
  }
};

const validateNumber = (input, fieldName) => {
  if (!Number.isFinite(input)) {
    throw new AppError(`${fieldName} must be a number`, 422, "VALIDATION_ERROR");
  }

  return input;
};

const validateNumberWithinRange = (value, fieldName, min, max) => {
  if (value < min || value > max) {
    throw new AppError(
      `${fieldName} must be between ${min} and ${max}`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return value;
};

export const validateNumberRange = (input, fieldName, min, max) => {
  validateRangeConfig(min, max);

  if (input == null) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  const value = validateNumber(input, fieldName);

  return validateNumberWithinRange(value, fieldName, min, max);
};

export const validateNullableNumberRange = (input, fieldName, min, max) => {
  validateRangeConfig(min, max);

  if (input == null) return null;

  const value = validateNumber(input, fieldName);

  return validateNumberWithinRange(value, fieldName, min, max);
};

export const validateIntegerRange = (input, fieldName, min, max) => {
  const value = validateNumberRange(input, fieldName, min, max);

  if (!Number.isInteger(value)) {
    throw new AppError(
      `${fieldName} must be an integer`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return value;
};

export const validateNullableIntegerRange = (input, fieldName, min, max) => {
  const value = validateNullableNumberRange(input, fieldName, min, max);

  if (value !== null && !Number.isInteger(value)) {
    throw new AppError(
      `${fieldName} must be an integer`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return value;
};