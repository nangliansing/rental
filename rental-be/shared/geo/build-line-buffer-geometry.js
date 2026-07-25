import { buffer } from "@turf/buffer";

import { AppError } from "../errors/app-error.js";

export const buildLineBufferGeometry = (geometry, distanceMeters) => {
  let bufferedFeature;

  try {
    bufferedFeature = buffer(geometry, distanceMeters, { units: "meters" });
  } catch {
    throw new AppError(
      "Unable to create a search area from geometry",
      422,
      "INVALID_LINE_GEOMETRY",
    );
  }

  const bufferedGeometry = bufferedFeature?.geometry;
  if (
    !bufferedGeometry ||
    !["Polygon", "MultiPolygon"].includes(bufferedGeometry.type)
  ) {
    throw new AppError(
      "Unable to create a search area from geometry",
      422,
      "INVALID_LINE_GEOMETRY",
    );
  }

  return bufferedGeometry;
};
