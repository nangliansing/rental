import { getEnvironment } from "../../../config/index.js";
import { roundCoordinate } from "../../../shared/geo/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";
import { buildGeocodeCacheKey } from "../cache/build-geocode-cache-key.js";
import {
  findGeocodeCacheByKey,
  upsertGeocodeCache,
} from "../cache/geocode-cache.repository.js";
import {
  GEOCODE_CACHE_COORDINATE_DECIMALS,
  GEOCODE_SOURCE,
} from "../geocode.constants.js";
import { queryGoogleReverseGeocoding } from "../providers/google-reverse-geocoding.provider.js";

const inflightRequests = new Map();

const buildCacheExpiry = (fetchedAt, cacheTtlDays) => {
  const expiresAt = new Date(fetchedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + cacheTtlDays);
  return expiresAt;
};

const mapCachedRecord = (record) => ({
  lat: record.lat,
  lng: record.lng,
  formattedAddress: record.formattedAddress,
  placeId: record.placeId,
  source: GEOCODE_SOURCE.GOOGLE,
  cached: true,
  fetchedAt: record.fetchedAt.toISOString(),
});

const fetchAndPersistReverseGeocode = async ({
  cacheKey,
  lat,
  lng,
  session,
}) => {
  const config = getEnvironment();
  const fetchedAt = new Date();
  const geocoded = await queryGoogleReverseGeocoding({ lat, lng });
  const roundedLat = roundCoordinate(lat, GEOCODE_CACHE_COORDINATE_DECIMALS);
  const roundedLng = roundCoordinate(lng, GEOCODE_CACHE_COORDINATE_DECIMALS);
  const expiresAt = buildCacheExpiry(fetchedAt, config.geocode.cacheTtlDays);

  await upsertGeocodeCache({
    cacheKey,
    lat: roundedLat,
    lng: roundedLng,
    formattedAddress: geocoded.formattedAddress,
    placeId: geocoded.placeId,
    fetchedAt,
    expiresAt,
    session,
  });

  return {
    lat: roundedLat,
    lng: roundedLng,
    formattedAddress: geocoded.formattedAddress,
    placeId: geocoded.placeId,
    source: GEOCODE_SOURCE.GOOGLE,
    cached: false,
    fetchedAt: fetchedAt.toISOString(),
  };
};

const resolveUncachedReverseGeocodeAddress = async ({
  cacheKey,
  lat,
  lng,
  session,
}) => {
  const cachedRecord = await findGeocodeCacheByKey({ cacheKey, session });

  if (cachedRecord) {
    return mapCachedRecord(cachedRecord);
  }

  return fetchAndPersistReverseGeocode({
    cacheKey,
    lat,
    lng,
    session,
  });
};

export const resolveReverseGeocodeAddress = async ({
  lat,
  lng,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const cacheKey = buildGeocodeCacheKey({ lat, lng });
  const inflight = inflightRequests.get(cacheKey);

  if (inflight) {
    return inflight;
  }

  const promise = resolveUncachedReverseGeocodeAddress({
    cacheKey,
    lat,
    lng,
    session,
  }).finally(() => {
    inflightRequests.delete(cacheKey);
  });

  inflightRequests.set(cacheKey, promise);

  return promise;
};
