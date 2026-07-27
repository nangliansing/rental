import { getEnvironment } from "../../../config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import { buildNeighbourhoodCacheKey } from "../cache/build-neighbourhood-cache-key.js";
import {
  findNeighbourhoodCacheByKey,
  findStaleNeighbourhoodCacheByKey,
  upsertNeighbourhoodCache,
} from "../cache/neighbourhood-cache.repository.js";
import { queryOverpass } from "../providers/overpass.provider.js";
import { dedupeTransitPlaces } from "./dedupe-transit-places.service.js";
import { loadStaticTransitPlaces } from "./load-static-transit-places.service.js";
import {
  sanitizeNeighbourhoodPlaces,
  toFetchedAtDate,
  validateNeighbourhoodOrigin,
} from "./neighbourhood-place.utils.js";

const buildCacheExpiry = (cacheTtlDays) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + cacheTtlDays);
  return expiresAt;
};

const dedupePlaces = (places) => {
  const seen = new Set();

  return places.filter((place) => {
    if (seen.has(place.id)) {
      return false;
    }

    seen.add(place.id);
    return true;
  });
};

const mergeWithStaticTransitPlaces = ({
  places,
  origin,
  fetchRadiusMeters,
}) =>
  dedupePlaces(
    dedupeTransitPlaces([
      ...places,
      ...loadStaticTransitPlaces({
        origin,
        fetchRadiusMeters,
      }),
    ]),
  );

const buildResolvedPayload = ({
  places,
  origin,
  fetchRadiusMeters,
  fetchedAt,
  cacheStatus,
}) => ({
  places: mergeWithStaticTransitPlaces({
    places: sanitizeNeighbourhoodPlaces(places),
    origin,
    fetchRadiusMeters,
  }),
  fetchedAt: toFetchedAtDate(fetchedAt),
  cacheStatus,
});

const buildMergedPayload = ({ places, fetchedAt, cacheStatus }) => ({
  places,
  fetchedAt: toFetchedAtDate(fetchedAt),
  cacheStatus,
});

export const resolveNeighbourhoodPlaces = async ({
  origin,
  fetchRadiusMeters,
  session = null,
  queryOverpassFn = queryOverpass,
  overpassEnabled: overpassEnabledOverride = null,
}) => {
  validateNullableObject(session, "session");
  validateNeighbourhoodOrigin(origin);

  const config = getEnvironment();
  const cacheTtlDays = config.neighbourhood?.cacheTtlDays ?? 14;
  const overpassEnabled =
    overpassEnabledOverride ?? config.neighbourhood?.overpassEnabled ?? true;
  const cacheKey = buildNeighbourhoodCacheKey({ origin, fetchRadiusMeters });
  const cachedEntry = await findNeighbourhoodCacheByKey({ cacheKey, session });

  if (cachedEntry) {
    return buildResolvedPayload({
      places: cachedEntry.places,
      origin,
      fetchRadiusMeters,
      fetchedAt: cachedEntry.fetchedAt,
      cacheStatus: "hit",
    });
  }

  let osmPlaces = [];
  let overpassFetchFailed = false;

  if (overpassEnabled) {
    try {
      osmPlaces = await queryOverpassFn({ origin, fetchRadiusMeters });
    } catch (error) {
      overpassFetchFailed = true;
      const staleEntry = await findStaleNeighbourhoodCacheByKey({
        cacheKey,
        session,
      });

      if (staleEntry) {
        return buildResolvedPayload({
          places: staleEntry.places,
          origin,
          fetchRadiusMeters,
          fetchedAt: staleEntry.fetchedAt,
          cacheStatus: "stale",
        });
      }

      if (!(error instanceof AppError)) {
        throw error;
      }

      if (error.code !== "NEIGHBOURHOOD_UNAVAILABLE") {
        throw error;
      }
    }
  }

  const places = mergeWithStaticTransitPlaces({
    places: sanitizeNeighbourhoodPlaces(osmPlaces),
    origin,
    fetchRadiusMeters,
  });
  const fetchedAt = new Date();

  if (overpassEnabled && overpassFetchFailed && osmPlaces.length === 0) {
    return buildMergedPayload({
      places,
      fetchedAt,
      cacheStatus: "bypass",
    });
  }

  const expiresAt = buildCacheExpiry(cacheTtlDays);

  await upsertNeighbourhoodCache({
    cacheKey,
    origin,
    fetchRadiusMeters,
    places,
    fetchedAt,
    expiresAt,
    session,
  });

  return buildMergedPayload({
    places,
    fetchedAt,
    cacheStatus: overpassEnabled ? "miss" : "bypass",
  });
};
