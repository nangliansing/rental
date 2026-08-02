import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

let configuredLimiters;

const rateLimitResponse = Object.freeze({
  success: false,
  code: "RATE_LIMIT_EXCEEDED",
  message: "Too many requests. Please try again later.",
});

const getClientKey = (req) => `ip:${ipKeyGenerator(req.ip)}`;
const getAuthenticatedKey = (req) =>
  req.user?.id ? `user:${req.user.id}` : getClientKey(req);

const createLimiter = ({
  createStore,
  identifier,
  keyGenerator = getClientKey,
  limit,
  prefix,
  skip,
  windowMs,
}) => {
  const store = createStore(prefix);

  return rateLimit({
    windowMs,
    limit,
    identifier,
    keyGenerator,
    skip,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        ...rateLimitResponse,
        requestId: req.id,
      }),
    passOnStoreError: false,
    ...(store ? { store } : {}),
  });
};

export const initializeRateLimiters = ({ config, createStore }) => {
  configuredLimiters = {
    global: createLimiter({
      createStore,
      prefix: "global",
      identifier: "global-api",
      windowMs: 5 * MINUTE,
      limit: config.globalMax,
    }),
    read: createLimiter({
      createStore,
      prefix: "read",
      identifier: "api-read",
      windowMs: MINUTE,
      limit: config.readMax,
      skip: (req) => !["GET", "HEAD"].includes(req.method),
    }),
    mutation: createLimiter({
      createStore,
      prefix: "mutation",
      identifier: "api-mutation",
      windowMs: 10 * MINUTE,
      limit: config.mutationMax,
      skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    }),
    search: createLimiter({
      createStore,
      prefix: "search",
      identifier: "public-search",
      windowMs: MINUTE,
      limit: config.searchMax,
    }),
    authentication: createLimiter({
      createStore,
      prefix: "authentication",
      identifier: "authentication",
      windowMs: 15 * MINUTE,
      limit: config.authMax,
    }),
    sensitiveAction: createLimiter({
      createStore,
      prefix: "sensitive-action",
      identifier: "sensitive-action",
      windowMs: HOUR,
      limit: config.sensitiveActionMax,
      keyGenerator: getAuthenticatedKey,
    }),
    upload: createLimiter({
      createStore,
      prefix: "upload",
      identifier: "upload-signature",
      windowMs: 10 * MINUTE,
      limit: config.uploadMax,
      keyGenerator: getAuthenticatedKey,
    }),
    adminMutation: createLimiter({
      createStore,
      prefix: "admin-mutation",
      identifier: "admin-mutation",
      windowMs: 10 * MINUTE,
      limit: config.adminMutationMax,
      keyGenerator: getAuthenticatedKey,
      skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    }),
    geocode: createLimiter({
      createStore,
      prefix: "geocode",
      identifier: "geocode-reverse",
      windowMs: MINUTE,
      limit: config.geocodeMax,
      keyGenerator: getAuthenticatedKey,
    }),
  };

  return configuredLimiters;
};

const useLimiter = (name) => (req, res, next) => {
  if (!configuredLimiters) {
    return next(new Error("Rate limiters have not been initialized"));
  }

  return configuredLimiters[name](req, res, next);
};

export const globalRateLimit = useLimiter("global");
export const readRateLimit = useLimiter("read");
export const mutationRateLimit = useLimiter("mutation");
export const searchRateLimit = useLimiter("search");
export const authenticationRateLimit = useLimiter("authentication");
export const sensitiveActionRateLimit = useLimiter("sensitiveAction");
export const uploadRateLimit = useLimiter("upload");
export const adminMutationRateLimit = useLimiter("adminMutation");
export const geocodeRateLimit = useLimiter("geocode");
