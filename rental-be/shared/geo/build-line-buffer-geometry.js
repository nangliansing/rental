import { buildBufferedGeometry } from "./build-buffered-geometry.js";

export const buildLineBufferGeometry = (geometry, distanceMeters) => {
  return buildBufferedGeometry(geometry, distanceMeters, {
    message: "Unable to create a search area from geometry",
    code: "INVALID_LINE_GEOMETRY",
  });
};
