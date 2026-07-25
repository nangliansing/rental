import { AppError } from "../errors/app-error.js";

export const validateCoordinates = (input, fieldName = "coordinates") => {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    !Number.isFinite(input[0]) ||
    !Number.isFinite(input[1]) ||
    input[0] < -180 ||
    input[0] > 180 ||
    input[1] < -90 ||
    input[1] > 90
  ) {
    throw new AppError(
      `${fieldName} must be [lng, lat] with valid longitude and latitude`,
      422,
      "VALIDATION_ERROR"
    );
  }

  return [...input];
};

export const validateLocation = (input, fieldName = "location") => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  const type = input.type ?? "Point";

  if (type !== "Point") {
    throw new AppError(`${fieldName}.type must be Point`, 422, "VALIDATION_ERROR");
  }

  return {
    type: "Point",
    coordinates: validateCoordinates(input.coordinates, `${fieldName}.coordinates`),
  };
};