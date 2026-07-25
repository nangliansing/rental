import {
  validateBoolean,
  validateDistanceMeters,
  validateLimit,
  validateLineGeometry,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import { buildSearchFilters } from "../filters/index.js";

const DEFAULT_DISTANCE_METERS = 500;
const MAX_DISTANCE_METERS = 2000;

export const buildSearchBuildingsNearLinesParams = (body) => {
  validateObject(body, "body");

  return {
    geometry: validateLineGeometry(body.geometry),
    distanceMeters: validateDistanceMeters(
      body.distanceMeters,
      "distanceMeters",
      {
        defaultValue: DEFAULT_DISTANCE_METERS,
        maxValue: MAX_DISTANCE_METERS,
      },
    ),
    filters: buildSearchFilters(body),
    page: validatePage(body.page),
    limit: validateLimit(body.limit),
    includeBuildingsWithoutMatchingListings:
      body.includeBuildingsWithoutMatchingListings === undefined
        ? false
        : validateBoolean(
            body.includeBuildingsWithoutMatchingListings,
            "includeBuildingsWithoutMatchingListings",
          ),
  };
};
