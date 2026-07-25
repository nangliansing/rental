// src/shared/validators/email.validators.js
import { AppError } from "../errors/app-error.js";

export const validateEmail = (input, fieldName = "email") => {
  if (typeof input !== "string") {
    throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
  }

  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  if (normalized.length > 254) {
    throw new AppError(
      `${fieldName} must be at most 254 characters`,
      422,
      "VALIDATION_ERROR"
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalized)) {
    throw new AppError(`${fieldName} must be a valid email`, 422, "VALIDATION_ERROR");
  }

  return normalized;
};