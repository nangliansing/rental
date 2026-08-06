import { AppError } from "../errors/app-error.js";
import { validateCoordinates } from "./geo.validators.js";
import { validateObject } from "./object.validators.js";

const MAX_POLYGON_COUNT = 100;
const MAX_RING_COUNT = 100;
const MAX_POSITION_COUNT = 1000;

const samePosition = (left, right) =>
  left[0] === right[0] && left[1] === right[1];

const orientation = (start, end, point) =>
  (end[0] - start[0]) * (point[1] - start[1]) -
  (end[1] - start[1]) * (point[0] - start[0]);

const isPointOnSegment = (start, end, point) =>
  Math.abs(orientation(start, end, point)) <= Number.EPSILON &&
  point[0] >= Math.min(start[0], end[0]) &&
  point[0] <= Math.max(start[0], end[0]) &&
  point[1] >= Math.min(start[1], end[1]) &&
  point[1] <= Math.max(start[1], end[1]);

const segmentsIntersect = (leftStart, leftEnd, rightStart, rightEnd) => {
  const leftStartSide = orientation(leftStart, leftEnd, rightStart);
  const leftEndSide = orientation(leftStart, leftEnd, rightEnd);
  const rightStartSide = orientation(rightStart, rightEnd, leftStart);
  const rightEndSide = orientation(rightStart, rightEnd, leftEnd);

  if (
    ((leftStartSide > 0 && leftEndSide < 0) ||
      (leftStartSide < 0 && leftEndSide > 0)) &&
    ((rightStartSide > 0 && rightEndSide < 0) ||
      (rightStartSide < 0 && rightEndSide > 0))
  ) {
    return true;
  }

  return (
    isPointOnSegment(leftStart, leftEnd, rightStart) ||
    isPointOnSegment(leftStart, leftEnd, rightEnd) ||
    isPointOnSegment(rightStart, rightEnd, leftStart) ||
    isPointOnSegment(rightStart, rightEnd, leftEnd)
  );
};

const assertRingDoesNotSelfIntersect = (ring, fieldName) => {
  const edgeCount = ring.length - 1;

  for (let leftIndex = 0; leftIndex < edgeCount; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < edgeCount; rightIndex += 1) {
      const edgesAreAdjacent =
        rightIndex === leftIndex + 1 ||
        (leftIndex === 0 && rightIndex === edgeCount - 1);

      if (edgesAreAdjacent) continue;

      if (
        segmentsIntersect(
          ring[leftIndex],
          ring[leftIndex + 1],
          ring[rightIndex],
          ring[rightIndex + 1],
        )
      ) {
        throw new AppError(
          `${fieldName} must not self-intersect`,
          422,
          "VALIDATION_ERROR",
        );
      }
    }
  }
};

const assertRingHasArea = (ring, fieldName) => {
  const twiceSignedArea = ring.slice(0, -1).reduce(
    (total, position, index) =>
      total +
      position[0] * ring[index + 1][1] -
      ring[index + 1][0] * position[1],
    0,
  );
  const coordinateScale = ring.reduce(
    (largest, position) =>
      Math.max(largest, Math.abs(position[0]), Math.abs(position[1])),
    1,
  );
  const numericalTolerance =
    Number.EPSILON * coordinateScale * coordinateScale * ring.length;

  if (Math.abs(twiceSignedArea) <= numericalTolerance) {
    throw new AppError(
      `${fieldName} must enclose a non-zero area`,
      422,
      "VALIDATION_ERROR",
    );
  }
};

const ringsIntersect = (leftRing, rightRing) => {
  for (let leftIndex = 0; leftIndex < leftRing.length - 1; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < rightRing.length - 1; rightIndex += 1) {
      if (
        segmentsIntersect(
          leftRing[leftIndex],
          leftRing[leftIndex + 1],
          rightRing[rightIndex],
          rightRing[rightIndex + 1],
        )
      ) {
        return true;
      }
    }
  }

  return false;
};

const isPointInsideRing = (point, ring) => {
  let inside = false;

  for (
    let currentIndex = 0, previousIndex = ring.length - 2;
    currentIndex < ring.length - 1;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = ring[currentIndex];
    const previous = ring[previousIndex];
    const crossesLatitude =
      (current[1] > point[1]) !== (previous[1] > point[1]);
    const crossingLongitude =
      ((previous[0] - current[0]) * (point[1] - current[1])) /
        (previous[1] - current[1]) +
      current[0];

    if (crossesLatitude && point[0] < crossingLongitude) inside = !inside;
  }

  return inside;
};

const assertPolygonRingTopology = (rings, fieldName) => {
  const exterior = rings[0];

  for (let holeIndex = 1; holeIndex < rings.length; holeIndex += 1) {
    const hole = rings[holeIndex];
    const conflictsWithExterior =
      ringsIntersect(exterior, hole) || !isPointInsideRing(hole[0], exterior);
    const conflictsWithAnotherHole = rings
      .slice(1, holeIndex)
      .some(
        (otherHole) =>
          ringsIntersect(otherHole, hole) ||
          isPointInsideRing(hole[0], otherHole) ||
          isPointInsideRing(otherHole[0], hole),
      );

    if (conflictsWithExterior || conflictsWithAnotherHole) {
      throw new AppError(
        `${fieldName}[${holeIndex}] must be contained within the exterior ring and must not intersect another ring`,
        422,
        "VALIDATION_ERROR",
      );
    }
  }
};

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

  assertRingDoesNotSelfIntersect(ring, fieldName);
  assertRingHasArea(ring, fieldName);

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

  const rings = input.map((ring, index) =>
    validateRing(ring, `${fieldName}[${index}]`),
  );

  assertPolygonRingTopology(rings, fieldName);

  return rings;
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
