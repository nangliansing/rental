import { buffer } from "@turf/buffer";

import { AppError } from "../../../shared/errors/app-error.js";
import { buildBoundsPolygon } from "../../../shared/geo/index.js";
import { GEO_SEARCH_MODES } from "../saved-search.constants.js";

const assertPolygonalCoverage = (geometry) => {
  if (
    !geometry ||
    !["Polygon", "MultiPolygon"].includes(geometry.type) ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new AppError(
      "Unable to create saved search coverage",
      422,
      "INVALID_SAVED_SEARCH_COVERAGE",
    );
  }

  return { type: geometry.type, coordinates: geometry.coordinates };
};

const buildBufferedCoverage = (geometry, distanceMeters) => {
  let feature;

  try {
    feature = buffer(geometry, distanceMeters, { units: "meters" });
  } catch {
    throw new AppError(
      "Unable to create saved search coverage",
      422,
      "INVALID_SAVED_SEARCH_COVERAGE",
    );
  }

  return assertPolygonalCoverage(feature?.geometry);
};

/** Normalize bounds, radius, and buffered-line searches for one geo index. */
export const buildSavedSearchCoverage = (geoSearch) => {
  if (geoSearch?.mode === GEO_SEARCH_MODES.AREA) {
    return assertPolygonalCoverage(buildBoundsPolygon(geoSearch.bounds));
  }

  if (geoSearch?.mode === GEO_SEARCH_MODES.NEARBY) {
    return buildBufferedCoverage(
      {
        type: "Point",
        coordinates: [geoSearch.position.lng, geoSearch.position.lat],
      },
      geoSearch.radiusMeters,
    );
  }

  if (geoSearch?.mode === GEO_SEARCH_MODES.LINE) {
    return buildBufferedCoverage(
      geoSearch.geometry,
      geoSearch.distanceMeters,
    );
  }

  throw new AppError(
    "Unsupported saved search mode",
    422,
    "INVALID_SAVED_SEARCH_COVERAGE",
  );
};

export const withSavedSearchCoverage = (geoSearch) => ({
  ...geoSearch,
  coverage: buildSavedSearchCoverage(geoSearch),
});
