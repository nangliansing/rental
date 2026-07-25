import { AppError } from "../errors/app-error.js";

export const validateStringArray = (input, fieldName, allowedValues = null) => {
  if (input == null) return [];

  if (!Array.isArray(input)) {
    throw new AppError(`${fieldName} must be an array`, 422, "VALIDATION_ERROR");
  }

  if (
    allowedValues != null &&
    !(allowedValues instanceof Set) &&
    !Array.isArray(allowedValues)
  ) {
    throw new AppError("allowedValues must be an array or Set", 500, "INTERNAL_ERROR");
  }

  const allowedSet =
    allowedValues == null
      ? null
      : allowedValues instanceof Set
        ? allowedValues
        : new Set(allowedValues);

  const values = input.map((item) => {
    if (typeof item !== "string") {
      throw new AppError(
        `${fieldName} must only contain strings`,
        422,
        "VALIDATION_ERROR"
      );
    }

    const trimmed = item.trim();

    if (!trimmed) {
      throw new AppError(
        `${fieldName} cannot contain empty strings`,
        422,
        "VALIDATION_ERROR"
      );
    }

    if (allowedSet && !allowedSet.has(trimmed)) {
      throw new AppError(`Invalid ${fieldName}: ${trimmed}`, 422, "VALIDATION_ERROR");
    }

    return trimmed;
  });

  return [...new Set(values)];
};