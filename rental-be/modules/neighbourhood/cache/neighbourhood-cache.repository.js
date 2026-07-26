import NeighbourhoodCache from "./neighbourhood-cache.model.js";

export const findNeighbourhoodCacheByKey = async ({
  cacheKey,
  session = null,
}) => {
  let query = NeighbourhoodCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};

export const findStaleNeighbourhoodCacheByKey = async ({
  cacheKey,
  session = null,
}) => {
  let query = NeighbourhoodCache.findOne({ cacheKey })
    .sort({ fetchedAt: -1 })
    .lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};

export const upsertNeighbourhoodCache = async ({
  cacheKey,
  origin,
  fetchRadiusMeters,
  places,
  fetchedAt,
  expiresAt,
  session = null,
}) => {
  let query = NeighbourhoodCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      origin,
      fetchRadiusMeters,
      places,
      fetchedAt,
      expiresAt,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};
