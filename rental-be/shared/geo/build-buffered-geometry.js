import { buffer } from "@turf/buffer";

import { AppError } from "../errors/app-error.js";

export const buildBufferedGeometry = (
  geometry,
  distanceMeters,
  {
    message = "Unable to create a buffered search area",
    code = "INVALID_BUFFERED_GEOMETRY",
  } = {},
) => {
  let feature;

  try {
    feature = buffer(geometry, distanceMeters, { units: "meters" });
  } catch {
    throw new AppError(message, 422, code);
  }

  if (
    !feature?.geometry ||
    !["Polygon", "MultiPolygon"].includes(feature.geometry.type) ||
    !Array.isArray(feature.geometry.coordinates)
  ) {
    throw new AppError(message, 422, code);
  }

  return {
    type: feature.geometry.type,
    coordinates: feature.geometry.coordinates,
  };
};
