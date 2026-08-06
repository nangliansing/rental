import { AppError } from "../errors/app-error.js";
import { validateCoordinates } from "./geo.validators.js";
import { validateObject } from "./object.validators.js";

const MAX_POLYGON_COUNT = 100;
const MAX_RING_COUNT = 100;
const MAX_POSITION_COUNT = 1000;

const samePosition = (left, right) =>
  left[0] === right[0] && left[1] === right[1];

const validateRing = (input, fieldName) => {
  if (!Array.isArray(input) || input.length < 4) {
    throw new AppError(
      `${fieldName} must contain at least four positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const ring = input.map((position, index) =>
    validateCoordinates(position, `${fieldName}[${index}]`),
  );

  if (!samePosition(ring[0], ring[ring.length - 1])) {
    throw new AppError(
      `${fieldName} must be closed`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const distinctPositions = new Set(
    ring.slice(0, -1).map(([longitude, latitude]) => `${longitude},${latitude}`),
  );

  if (distinctPositions.size < 3) {
    throw new AppError(
      `${fieldName} must contain at least three distinct positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return ring;
};

const validatePolygon = (input, fieldName) => {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AppError(
      `${fieldName} must contain at least one ring`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (input.length > MAX_RING_COUNT) {
    throw new AppError(
      `${fieldName} cannot contain more than ${MAX_RING_COUNT} rings`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return input.map((ring, index) =>
    validateRing(ring, `${fieldName}[${index}]`),
  );
};

export const validatePolygonGeometry = (input, fieldName = "geometry") => {
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

  if (!["Polygon", "MultiPolygon"].includes(input.type)) {
    throw new AppError(
      `${fieldName}.type must be Polygon or MultiPolygon`,
      422,
      "VALIDATION_ERROR",
    );
  }

  let polygons;
  if (input.type === "Polygon") {
    polygons = [validatePolygon(input.coordinates, `${fieldName}.coordinates`)];
  } else {
    if (!Array.isArray(input.coordinates) || input.coordinates.length === 0) {
      throw new AppError(
        `${fieldName}.coordinates must contain at least one polygon`,
        422,
        "VALIDATION_ERROR",
      );
    }

    if (input.coordinates.length > MAX_POLYGON_COUNT) {
      throw new AppError(
        `${fieldName}.coordinates cannot contain more than ${MAX_POLYGON_COUNT} polygons`,
        422,
        "VALIDATION_ERROR",
      );
    }

    polygons = input.coordinates.map((polygon, index) =>
      validatePolygon(polygon, `${fieldName}.coordinates[${index}]`),
    );
  }

  const positionCount = polygons.reduce(
    (total, polygon) =>
      total + polygon.reduce((ringTotal, ring) => ringTotal + ring.length, 0),
    0,
  );

  if (positionCount > MAX_POSITION_COUNT) {
    throw new AppError(
      `${fieldName} cannot contain more than ${MAX_POSITION_COUNT} positions`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    type: input.type,
    coordinates: input.type === "Polygon" ? polygons[0] : polygons,
  };
};
