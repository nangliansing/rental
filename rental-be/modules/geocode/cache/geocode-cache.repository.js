import GeocodeCache from "./geocode-cache.model.js";

export const findGeocodeCacheByKey = async ({ cacheKey, session = null }) => {
  let query = GeocodeCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};

export const upsertGeocodeCache = async ({
  cacheKey,
  lat,
  lng,
  formattedAddress,
  placeId,
  fetchedAt,
  expiresAt,
  session = null,
}) => {
  let query = GeocodeCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      lat,
      lng,
      formattedAddress,
      placeId,
      fetchedAt,
      expiresAt,
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};
