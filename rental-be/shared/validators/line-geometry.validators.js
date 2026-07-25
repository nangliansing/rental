import { AppError } from "../errors/app-error.js";
import { validateNumberRange } from "./number.validators.js";
import { validateObject } from "./object.validators.js";

const SUPPORTED_LINE_TYPES = new Set(["LineString", "MultiLineString"]);
const MAX_LINE_COUNT = 100;
const MAX_POSITION_COUNT = 1000;

const validatePosition = (input, fieldName) => {
  if (!Array.isArray(input) || input.length !== 2) {
    throw new AppError(
      `${fieldName} must be a [longitude, latitude] pair`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return [
    validateNumberRange(input[0], `${fieldName}[0]`, -180, 180),
    validateNumberRange(input[1], `${fieldName}[1]`, -90, 90),
  ];
};

const validateLine = (input, fieldName) => {
  if (!Array.isArray(input) || input.length < 2) {
    throw new AppError(
      `${fieldName} must contain at least two positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const line = input.map((position, index) =>
    validatePosition(position, `${fieldName}[${index}]`),
  );

  const distinctPositions = new Set(
    line.map(([longitude, latitude]) => `${longitude},${latitude}`),
  );

  if (distinctPositions.size < 2) {
    throw new AppError(
      `${fieldName} must contain at least two distinct positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return line;
};

export const validateLineGeometry = (input, fieldName = "geometry") => {
  validateObject(input, fieldName);

  const keys = Object.keys(input);
  if (
    keys.length !== 2 ||
    !keys.includes("type") ||
    !keys.includes("coordinates")
  ) {
    throw new AppError(
      `${fieldName} must contain exactly: type, coordinates`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (!SUPPORTED_LINE_TYPES.has(input.type)) {
    throw new AppError(
      `${fieldName}.type must be LineString or MultiLineString`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const lines =
    input.type === "LineString"
      ? [validateLine(input.coordinates, `${fieldName}.coordinates`)]
      : (() => {
          if (
            !Array.isArray(input.coordinates) ||
            input.coordinates.length === 0
          ) {
            throw new AppError(
              `${fieldName}.coordinates must contain at least one line`,
              422,
              "VALIDATION_ERROR",
            );
          }

          if (input.coordinates.length > MAX_LINE_COUNT) {
            throw new AppError(
              `${fieldName}.coordinates cannot contain more than ${MAX_LINE_COUNT} lines`,
              422,
              "VALIDATION_ERROR",
            );
          }

          return input.coordinates.map((line, index) =>
            validateLine(line, `${fieldName}.coordinates[${index}]`),
          );
        })();

  const positionCount = lines.reduce((total, line) => total + line.length, 0);
  if (positionCount > MAX_POSITION_COUNT) {
    throw new AppError(
      `${fieldName} cannot contain more than ${MAX_POSITION_COUNT} positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    type: input.type,
    coordinates: input.type === "LineString" ? lines[0] : lines,
  };
};
