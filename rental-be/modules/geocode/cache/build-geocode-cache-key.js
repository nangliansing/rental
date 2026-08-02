import { roundCoordinate } from "../../../shared/geo/index.js";
import {
  GEOCODE_CACHE_COORDINATE_DECIMALS,
  GEOCODE_CACHE_VERSION,
} from "../geocode.constants.js";

export const buildGeocodeCacheKey = ({
  lat,
  lng,
  cacheVersion = GEOCODE_CACHE_VERSION,
}) => {
  const roundedLat = roundCoordinate(lat, GEOCODE_CACHE_COORDINATE_DECIMALS);
  const roundedLng = roundCoordinate(lng, GEOCODE_CACHE_COORDINATE_DECIMALS);

  return `${roundedLat}:${roundedLng}:v${cacheVersion}`;
};
