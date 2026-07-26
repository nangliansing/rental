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

export const resolveNeighbourhoodPlaces = async ({
  origin,
  fetchRadiusMeters,
  session = null,
  queryOverpassFn = queryOverpass,
  overpassEnabled: overpassEnabledOverride = null,
}) => {
  validateNullableObject(session, "session");

  const config = getEnvironment();
  const cacheTtlDays = config.neighbourhood?.cacheTtlDays ?? 14;
  const overpassEnabled =
    overpassEnabledOverride ?? config.neighbourhood?.overpassEnabled ?? true;
  const cacheKey = buildNeighbourhoodCacheKey({ origin, fetchRadiusMeters });
  const cachedEntry = await findNeighbourhoodCacheByKey({ cacheKey, session });

  if (cachedEntry) {
    return {
      places: mergeWithStaticTransitPlaces({
        places: cachedEntry.places,
        origin,
        fetchRadiusMeters,
      }),
      fetchedAt: cachedEntry.fetchedAt,
      cacheStatus: "hit",
    };
  }

  let osmPlaces = [];

  if (overpassEnabled) {
    try {
      osmPlaces = await queryOverpassFn({ origin, fetchRadiusMeters });
    } catch (error) {
      const staleEntry = await findStaleNeighbourhoodCacheByKey({
        cacheKey,
        session,
      });

      if (staleEntry) {
        return {
          places: mergeWithStaticTransitPlaces({
            places: staleEntry.places,
            origin,
            fetchRadiusMeters,
          }),
          fetchedAt: staleEntry.fetchedAt,
          cacheStatus: "stale",
        };
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
    places: osmPlaces,
    origin,
    fetchRadiusMeters,
  });
  const fetchedAt = new Date();
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

  return {
    places,
    fetchedAt,
    cacheStatus: overpassEnabled ? "miss" : "bypass",
  };
};
