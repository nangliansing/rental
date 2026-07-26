import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateDistanceMeters,
  validateMongooseId,
} from "../../../shared/validators/index.js";

import {
  DEFAULT_FETCH_RADIUS_METERS,
  DEFAULT_RADIUS_METERS,
  MAX_FETCH_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
} from "../neighbourhood.constants.js";

const normalizeQueryNumber = (input) =>
  typeof input === "string" && input.trim() !== "" ? Number(input) : input;

export const buildGetBuildingNeighbourhoodParams = ({
  buildingIdInput,
  queryInput = {},
}) => {
  const buildingId = validateMongooseId(buildingIdInput, "buildingId");
  const radiusMeters = validateDistanceMeters(
    normalizeQueryNumber(queryInput.radiusM),
    "radiusM",
    {
      defaultValue: DEFAULT_RADIUS_METERS,
      maxValue: MAX_RADIUS_METERS,
    },
  );
  const fetchRadiusMeters = validateDistanceMeters(
    normalizeQueryNumber(queryInput.fetchRadiusM),
    "fetchRadiusM",
    {
      defaultValue: DEFAULT_FETCH_RADIUS_METERS,
      maxValue: MAX_FETCH_RADIUS_METERS,
    },
  );

  if (radiusMeters < MIN_RADIUS_METERS) {
    throw new AppError(
      `radiusM must be at least ${MIN_RADIUS_METERS}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (radiusMeters > fetchRadiusMeters) {
    throw new AppError(
      "radiusM must be less than or equal to fetchRadiusM",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    buildingId,
    radiusMeters,
    fetchRadiusMeters,
  };
};
