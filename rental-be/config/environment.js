const ALLOWED_NODE_ENVIRONMENTS = new Set([
  "development",
  "production",
  "test",
]);
const ALLOWED_COOKIE_SAME_SITE_VALUES = new Set(["strict", "lax", "none"]);
const DEFAULT_DEVELOPMENT_ORIGINS = ["http://localhost:5173"];
const JWT_DURATION_PATTERN = /^\d+(ms|s|m|h|d|w|y)$/i;
const BODY_LIMIT_PATTERN = /^\d+(b|kb|mb)$/i;
const RATE_LIMIT_STORES = new Set(["memory", "redis"]);
const LOG_LEVELS = new Set([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);
const SERVICE_NAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const GOOGLE_CLIENT_ID_PATTERN =
  /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

let environmentConfig;

export class EnvironmentValidationError extends Error {
  constructor(issues) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

const readString = (env, key) => {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
};

const requireString = (env, key, issues) => {
  const value = readString(env, key);

  if (!value) {
    issues.push(`${key} is required`);
  }

  return value;
};

const parsePort = (env, issues) => {
  const rawPort = readString(env, "PORT") || "3000";
  const port = Number(rawPort);

  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push("PORT must be an integer between 1 and 65535");
  }

  return port;
};

const parseInteger = (env, key, defaultValue, min, max, issues) => {
  const rawValue = readString(env, key) || String(defaultValue);
  const value = Number(rawValue);

  if (!/^\d+$/.test(rawValue) || !Number.isInteger(value) || value < min || value > max) {
    issues.push(`${key} must be an integer between ${min} and ${max}`);
  }

  return value;
};

const parseBoolean = (env, key, defaultValue, issues) => {
  const rawValue = readString(env, key);

  if (!rawValue) return defaultValue;
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  issues.push(`${key} must be true or false`);
  return defaultValue;
};

const parseOrigins = (env, nodeEnv, issues) => {
  const rawOrigins = readString(env, "CORS_ORIGINS");

  if (!rawOrigins) {
    if (nodeEnv === "production") {
      issues.push("CORS_ORIGINS is required in production");
      return [];
    }

    return [...DEFAULT_DEVELOPMENT_ORIGINS];
  }

  const origins = [...new Set(rawOrigins.split(",").map((value) => value.trim()).filter(Boolean))];

  if (origins.length === 0) {
    issues.push("CORS_ORIGINS must contain at least one origin");
  }

  for (const origin of origins) {
    if (origin === "*") {
      issues.push("CORS_ORIGINS cannot contain * when credentials are enabled");
      continue;
    }

    try {
      const url = new URL(origin);

      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
        throw new Error();
      }
    } catch {
      issues.push(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }
  }

  return origins;
};

const parseGoogleClientIds = (env, issues) => {
  const rawClientIds = requireString(env, "GOOGLE_CLIENT_IDS", issues);

  if (!rawClientIds) {
    return [];
  }

  const clientIds = [
    ...new Set(
      rawClientIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  if (clientIds.length === 0) {
    issues.push("GOOGLE_CLIENT_IDS must contain at least one client ID");
  }

  for (const clientId of clientIds) {
    if (!GOOGLE_CLIENT_ID_PATTERN.test(clientId)) {
      issues.push("GOOGLE_CLIENT_IDS contains an invalid Google client ID");
      break;
    }
  }

  return clientIds;
};

export const validateEnvironment = (env = process.env) => {
  const issues = [];
  const nodeEnv = requireString(env, "NODE_ENV", issues);

  if (nodeEnv && !ALLOWED_NODE_ENVIRONMENTS.has(nodeEnv)) {
    issues.push("NODE_ENV must be development, production, or test");
  }

  const mongodbUri = requireString(env, "MONGODB_URI", issues);

  if (
    mongodbUri &&
    !mongodbUri.startsWith("mongodb://") &&
    !mongodbUri.startsWith("mongodb+srv://")
  ) {
    issues.push("MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme");
  }

  const jwtAccessSecret = requireString(env, "JWT_ACCESS_SECRET", issues);
  const jwtRefreshSecret = requireString(env, "JWT_REFRESH_SECRET", issues);

  if (jwtAccessSecret && jwtAccessSecret.length < 32) {
    issues.push("JWT_ACCESS_SECRET must be at least 32 characters");
  }

  if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
    issues.push("JWT_REFRESH_SECRET must be at least 32 characters");
  }

  if (jwtAccessSecret && jwtAccessSecret === jwtRefreshSecret) {
    issues.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  }

  const jwtAccessExpiresIn =
    readString(env, "JWT_ACCESS_EXPIRES_IN") || "15m";

  if (!JWT_DURATION_PATTERN.test(jwtAccessExpiresIn)) {
    issues.push("JWT_ACCESS_EXPIRES_IN must be a duration such as 15m or 1h");
  }

  const cookieSameSite = readString(env, "COOKIE_SAME_SITE") || "strict";

  if (!ALLOWED_COOKIE_SAME_SITE_VALUES.has(cookieSameSite)) {
    issues.push("COOKIE_SAME_SITE must be strict, lax, or none");
  }

  if (cookieSameSite === "none" && nodeEnv !== "production") {
    issues.push("COOKIE_SAME_SITE=none requires NODE_ENV=production");
  }

  const jsonBodyLimit = readString(env, "JSON_BODY_LIMIT") || "256kb";

  if (!BODY_LIMIT_PATTERN.test(jsonBodyLimit)) {
    issues.push("JSON_BODY_LIMIT must be a size such as 256kb or 1mb");
  }

  const trustProxyHopsInput = readString(env, "TRUST_PROXY_HOPS");

  if (nodeEnv === "production" && !trustProxyHopsInput) {
    issues.push("TRUST_PROXY_HOPS is required in production");
  }

  const trustProxyHops = parseInteger(
    env,
    "TRUST_PROXY_HOPS",
    0,
    0,
    10,
    issues,
  );
  const rateLimitStore =
    readString(env, "RATE_LIMIT_STORE") ||
    (nodeEnv === "production" ? "redis" : "memory");

  if (!RATE_LIMIT_STORES.has(rateLimitStore)) {
    issues.push("RATE_LIMIT_STORE must be memory or redis");
  }

  if (nodeEnv === "production" && rateLimitStore !== "redis") {
    issues.push("RATE_LIMIT_STORE must be redis in production");
  }

  const redisUrl = readString(env, "REDIS_URL");

  if (rateLimitStore === "redis" && !redisUrl) {
    issues.push("REDIS_URL is required when RATE_LIMIT_STORE=redis");
  }

  const logLevel =
    readString(env, "LOG_LEVEL") || (nodeEnv === "test" ? "silent" : "info");

  if (!LOG_LEVELS.has(logLevel)) {
    issues.push("LOG_LEVEL must be fatal, error, warn, info, debug, trace, or silent");
  }

  const serviceName = readString(env, "SERVICE_NAME") || "rental-be";

  if (!SERVICE_NAME_PATTERN.test(serviceName)) {
    issues.push("SERVICE_NAME must contain 1-64 letters, numbers, dots, underscores, or hyphens");
  }

  const metricsEnabled = parseBoolean(env, "METRICS_ENABLED", true, issues);
  const metricsToken = readString(env, "METRICS_TOKEN");

  if (nodeEnv === "production" && metricsEnabled && metricsToken.length < 32) {
    issues.push("METRICS_TOKEN must be at least 32 characters in production");
  }

  const config = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: parsePort(env, issues),
    shutdownTimeoutMs: parseInteger(
      env,
      "SHUTDOWN_TIMEOUT_MS",
      10000,
      1000,
      60000,
      issues,
    ),
    trustProxyHops,
    jsonBodyLimit,
    mongodbUri,
    jwt: {
      accessSecret: jwtAccessSecret,
      refreshSecret: jwtRefreshSecret,
      accessExpiresIn: jwtAccessExpiresIn,
    },
    google: {
      clientIds: parseGoogleClientIds(env, issues),
    },
    cloudinary: {
      cloudName: requireString(env, "CLOUDINARY_CLOUD_NAME", issues),
      apiKey: requireString(env, "CLOUDINARY_API_KEY", issues),
      apiSecret: requireString(env, "CLOUDINARY_API_SECRET", issues),
    },
    corsOrigins: parseOrigins(env, nodeEnv, issues),
    cookie: {
      secure: nodeEnv === "production",
      sameSite: cookieSameSite,
      domain: readString(env, "COOKIE_DOMAIN") || undefined,
    },
    logging: {
      level: logLevel,
      serviceName,
    },
    metrics: {
      enabled: metricsEnabled,
      token: metricsToken || undefined,
      collectDefaultMetrics: nodeEnv !== "test",
    },
    rateLimit: {
      store: rateLimitStore,
      redisUrl: redisUrl || undefined,
      globalMax: parseInteger(env, "RATE_LIMIT_GLOBAL_MAX", 300, 1, 100000, issues),
      readMax: parseInteger(env, "RATE_LIMIT_READ_MAX", 180, 1, 100000, issues),
      searchMax: parseInteger(env, "RATE_LIMIT_SEARCH_MAX", 60, 1, 100000, issues),
      authMax: parseInteger(env, "RATE_LIMIT_AUTH_MAX", 10, 1, 100000, issues),
      mutationMax: parseInteger(env, "RATE_LIMIT_MUTATION_MAX", 100, 1, 100000, issues),
      sensitiveActionMax: parseInteger(
        env,
        "RATE_LIMIT_SENSITIVE_ACTION_MAX",
        20,
        1,
        100000,
        issues,
      ),
      uploadMax: parseInteger(env, "RATE_LIMIT_UPLOAD_MAX", 30, 1, 100000, issues),
      adminMutationMax: parseInteger(
        env,
        "RATE_LIMIT_ADMIN_MUTATION_MAX",
        100,
        1,
        100000,
        issues,
      ),
    },
    neighbourhood: {
      overpassEnabled: parseBoolean(
        env,
        "NEIGHBOURHOOD_OVERPASS_ENABLED",
        nodeEnv !== "test",
        issues,
      ),
      overpassApiUrl:
        readString(env, "OVERPASS_API_URL") ||
        "https://overpass-api.de/api/interpreter",
      cacheTtlDays: parseInteger(
        env,
        "NEIGHBOURHOOD_CACHE_TTL_DAYS",
        14,
        1,
        90,
        issues,
      ),
    },
    queue: {
      enabled: parseBoolean(
        env,
        "QUEUE_ENABLED",
        nodeEnv === "production",
        issues,
      ),
      redisUrl: redisUrl || undefined,
      prefix: readString(env, "QUEUE_PREFIX") || "rental:queue",
      workerConcurrency: parseInteger(
        env,
        "WORKER_CONCURRENCY",
        5,
        1,
        50,
        issues,
      ),
      defaultAttempts: parseInteger(
        env,
        "QUEUE_DEFAULT_ATTEMPTS",
        5,
        1,
        10,
        issues,
      ),
      backoffDelayMs: parseInteger(
        env,
        "QUEUE_BACKOFF_DELAY_MS",
        30000,
        1000,
        300000,
        issues,
      ),
      removeOnCompleteAgeSeconds: parseInteger(
        env,
        "QUEUE_REMOVE_ON_COMPLETE_AGE_SECONDS",
        7 * 24 * 60 * 60,
        3600,
        30 * 24 * 60 * 60,
        issues,
      ),
      removeOnCompleteCount: parseInteger(
        env,
        "QUEUE_REMOVE_ON_COMPLETE_COUNT",
        1000,
        100,
        100000,
        issues,
      ),
      removeOnFailAgeSeconds: parseInteger(
        env,
        "QUEUE_REMOVE_ON_FAIL_AGE_SECONDS",
        30 * 24 * 60 * 60,
        3600,
        90 * 24 * 60 * 60,
        issues,
      ),
      removeOnFailCount: parseInteger(
        env,
        "QUEUE_REMOVE_ON_FAIL_COUNT",
        5000,
        100,
        100000,
        issues,
      ),
    },
  };

  if (config.queue.enabled && !config.queue.redisUrl) {
    issues.push("REDIS_URL is required when QUEUE_ENABLED=true");
  }

  if (issues.length > 0) {
    throw new EnvironmentValidationError(issues);
  }

  return Object.freeze({
    ...config,
    jwt: Object.freeze(config.jwt),
    google: Object.freeze({
      ...config.google,
      clientIds: Object.freeze(config.google.clientIds),
    }),
    cloudinary: Object.freeze(config.cloudinary),
    corsOrigins: Object.freeze(config.corsOrigins),
    cookie: Object.freeze(config.cookie),
    logging: Object.freeze(config.logging),
    metrics: Object.freeze(config.metrics),
    rateLimit: Object.freeze(config.rateLimit),
    neighbourhood: Object.freeze(config.neighbourhood),
    queue: Object.freeze(config.queue),
  });
};

export const initializeEnvironment = (env = process.env) => {
  environmentConfig = validateEnvironment(env);
  return environmentConfig;
};

export const getEnvironment = () => {
  if (!environmentConfig) {
    throw new Error("Environment configuration has not been initialized");
  }

  return environmentConfig;
};
