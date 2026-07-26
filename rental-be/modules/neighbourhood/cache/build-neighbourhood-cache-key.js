import { roundCoordinate } from "../../../shared/geo/index.js";
import { CACHE_COORDINATE_DECIMALS } from "../neighbourhood.constants.js";

export const buildNeighbourhoodCacheKey = ({
  origin,
  fetchRadiusMeters,
}) => {
  const lat = roundCoordinate(origin.lat, CACHE_COORDINATE_DECIMALS);
  const lng = roundCoordinate(origin.lng, CACHE_COORDINATE_DECIMALS);

  return `${lat}:${lng}:${fetchRadiusMeters}`;
};
