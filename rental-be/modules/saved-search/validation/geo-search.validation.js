import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateEnumValue,
  validateIntegerRange,
  validateLineGeometry,
  validateMapBounds,
  validateObject,
  validateOptionalString,
} from "../../../shared/validators/index.js";

import {
  SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
  GEO_SEARCH_MAX_DISTANCE_METERS,
  GEO_SEARCH_MAX_RADIUS_METERS,
  GEO_SEARCH_MIN_DISTANCE_METERS,
  GEO_SEARCH_MIN_RADIUS_METERS,
  GEO_SEARCH_MODES,
} from "../saved-search.constants.js";
import { validateMapPosition } from "./map-position.validation.js";

export const validateSavedSearchGeoSearch = (input) => {
  validateObject(input, "geoSearch");

  if (input.mode == null) {
    throw new AppError("mode is required", 422, "VALIDATION_ERROR");
  }

  const mode = validateEnumValue(
    input.mode,
    "mode",
    Object.values(GEO_SEARCH_MODES),
  );
  const placeName = validateOptionalString(
    input.placeName,
    "placeName",
    SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
  );

  if (mode === GEO_SEARCH_MODES.AREA) {
    return {
      mode,
      bounds: validateMapBounds(input.bounds, "bounds"),
      placeName,
    };
  }

  if (mode === GEO_SEARCH_MODES.NEARBY) {
    return {
      mode,
      position: validateMapPosition(input.position, "position"),
      radiusMeters: validateIntegerRange(
        input.radiusMeters,
        "radiusMeters",
        GEO_SEARCH_MIN_RADIUS_METERS,
        GEO_SEARCH_MAX_RADIUS_METERS,
      ),
      placeName,
    };
  }

  return {
    mode,
    geometry: validateLineGeometry(input.geometry, "geometry"),
    distanceMeters: validateIntegerRange(
      input.distanceMeters,
      "distanceMeters",
      GEO_SEARCH_MIN_DISTANCE_METERS,
      GEO_SEARCH_MAX_DISTANCE_METERS,
    ),
    placeName,
  };
};
