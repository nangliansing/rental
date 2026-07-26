import { roundCoordinate } from "../../../shared/geo/index.js";
import {
  CACHE_COORDINATE_DECIMALS,
  NEIGHBOURHOOD_CACHE_VERSION,
} from "../neighbourhood.constants.js";

export const buildNeighbourhoodCacheKey = ({
  origin,
  fetchRadiusMeters,
}) => {
  const lat = roundCoordinate(origin.lat, CACHE_COORDINATE_DECIMALS);
  const lng = roundCoordinate(origin.lng, CACHE_COORDINATE_DECIMALS);

  return `${NEIGHBOURHOOD_CACHE_VERSION}:${lat}:${lng}:${fetchRadiusMeters}`;
};
