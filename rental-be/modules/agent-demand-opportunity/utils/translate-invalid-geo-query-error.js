import { AppError } from "../../../shared/errors/app-error.js";

export const translateInvalidGeoQueryError = (error) => {
  const message = typeof error?.message === "string" ? error.message : "";
  const isInvalidGeometry =
    error?.code === 2 &&
    /(geojson|geo keys|loop|polygon|edge)/i.test(message);

  if (isInvalidGeometry) {
    throw new AppError(
      "area must be valid non-self-intersecting GeoJSON geometry",
      422,
      "VALIDATION_ERROR",
    );
  }

  throw error;
};
