import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EnvironmentValidationError,
  validateEnvironment,
} from "../config/environment.js";

const validEnvironment = (overrides = {}) => ({
  NODE_ENV: "development",
  PORT: "3000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/rental_test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  JWT_ACCESS_EXPIRES_IN: "15m",
  GOOGLE_CLIENT_IDS:
    "1060222059887-exampleclient.apps.googleusercontent.com",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  ...overrides,
});

const expectIssues = (overrides, expectedIssues) => {
  assert.throws(
    () => validateEnvironment(validEnvironment(overrides)),
    (error) => {
      assert.ok(error instanceof EnvironmentValidationError);

      for (const expectedIssue of expectedIssues) {
        assert.ok(error.issues.includes(expectedIssue));
      }

      return true;
    },
  );
};

describe("environment validation", () => {
  test("normalizes a valid development environment", () => {
    const config = validateEnvironment(validEnvironment());

    assert.equal(config.nodeEnv, "development");
    assert.equal(config.port, 3000);
    assert.equal(config.isProduction, false);
    assert.deepEqual(config.google.clientIds, [
      "1060222059887-exampleclient.apps.googleusercontent.com",
    ]);
    assert.deepEqual(config.corsOrigins, ["http://localhost:5173"]);
    assert.deepEqual(config.cookie, {
      secure: false,
      sameSite: "strict",
      domain: undefined,
    });
    assert.ok(Object.isFrozen(config));
  });

  test("requires an explicit production CORS allowlist", () => {
    expectIssues(
      { NODE_ENV: "production" },
      ["CORS_ORIGINS is required in production"],
    );
  });

  test("accepts unique production origins and secure cookies", () => {
    const config = validateEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com,https://admin.example.com",
        COOKIE_SAME_SITE: "none",
        COOKIE_DOMAIN: ".example.com",
        TRUST_PROXY_HOPS: "1",
        RATE_LIMIT_STORE: "redis",
        REDIS_URL: "redis://127.0.0.1:6379",
        METRICS_TOKEN: "metrics-token-with-at-least-32-characters",
        GOOGLE_MAPS_API_KEY: "production-geocode-key",
      }),
    );

    assert.deepEqual(config.corsOrigins, [
      "https://app.example.com",
      "https://admin.example.com",
    ]);
    assert.deepEqual(config.cookie, {
      secure: true,
      sameSite: "none",
      domain: ".example.com",
    });
  });

  test("requires shared rate limiting and explicit proxy trust in production", () => {
    expectIssues(
      {
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com",
        RATE_LIMIT_STORE: "memory",
      },
      [
        "TRUST_PROXY_HOPS is required in production",
        "RATE_LIMIT_STORE must be redis in production",
      ],
    );
  });

  test("validates request and quota limits", () => {
    expectIssues(
      {
        JSON_BODY_LIMIT: "huge",
        SHUTDOWN_TIMEOUT_MS: "100",
        TRUST_PROXY_HOPS: "11",
        RATE_LIMIT_GLOBAL_MAX: "0",
        RATE_LIMIT_SEARCH_MAX: "many",
      },
      [
        "JSON_BODY_LIMIT must be a size such as 256kb or 1mb",
        "SHUTDOWN_TIMEOUT_MS must be an integer between 1000 and 60000",
        "TRUST_PROXY_HOPS must be an integer between 0 and 10",
        "RATE_LIMIT_GLOBAL_MAX must be an integer between 1 and 100000",
        "RATE_LIMIT_SEARCH_MAX must be an integer between 1 and 100000",
      ],
    );
  });

  test("validates observability configuration", () => {
    expectIssues(
      {
        LOG_LEVEL: "verbose",
        METRICS_ENABLED: "sometimes",
        SERVICE_NAME: "invalid service name",
      },
      [
        "LOG_LEVEL must be fatal, error, warn, info, debug, trace, or silent",
        "METRICS_ENABLED must be true or false",
        "SERVICE_NAME must contain 1-64 letters, numbers, dots, underscores, or hyphens",
      ],
    );
  });

  test("requires a metrics token when production metrics are enabled", () => {
    expectIssues(
      {
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com",
        TRUST_PROXY_HOPS: "1",
        RATE_LIMIT_STORE: "redis",
        REDIS_URL: "redis://127.0.0.1:6379",
      },
      ["METRICS_TOKEN must be at least 32 characters in production"],
    );
  });

  test("requires Redis when the queue is enabled", () => {
    expectIssues(
      {
        QUEUE_ENABLED: "true",
      },
      ["REDIS_URL is required when QUEUE_ENABLED=true"],
    );
  });

  test("defaults the queue off in test and on in production", () => {
    const testConfig = validateEnvironment(validEnvironment({ NODE_ENV: "test" }));
    assert.equal(testConfig.queue.enabled, false);

    const productionConfig = validateEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com",
        TRUST_PROXY_HOPS: "1",
        RATE_LIMIT_STORE: "redis",
        REDIS_URL: "redis://127.0.0.1:6379",
        METRICS_TOKEN: "metrics-token-with-at-least-32-characters",
        GOOGLE_MAPS_API_KEY: "production-geocode-key",
      }),
    );

    assert.equal(productionConfig.queue.enabled, true);
    assert.equal(productionConfig.queue.prefix, "rental:queue");
    assert.equal(productionConfig.queue.workerConcurrency, 5);
    assert.equal(productionConfig.queue.workerDrainDelaySeconds, 30);
    assert.equal(productionConfig.queue.workerRedisCooldownInitialMs, 1_000);
    assert.equal(productionConfig.queue.workerRedisCooldownMaxMs, 60_000);
  });

  test("requires a Google Maps API key when reverse geocoding is enabled in production", () => {
    expectIssues(
      {
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com",
        TRUST_PROXY_HOPS: "1",
        RATE_LIMIT_STORE: "redis",
        REDIS_URL: "redis://127.0.0.1:6379",
        METRICS_TOKEN: "metrics-token-with-at-least-32-characters",
        GEOCODE_ENABLED: "true",
      },
      ["GOOGLE_MAPS_API_KEY is required when GEOCODE_ENABLED=true"],
    );
  });

  test("rejects malformed scalar configuration", () => {
    expectIssues(
      {
        NODE_ENV: "staging",
        PORT: "70000",
        MONGODB_URI: "https://database.example.com",
        JWT_ACCESS_EXPIRES_IN: "later",
      },
      [
        "NODE_ENV must be development, production, or test",
        "PORT must be an integer between 1 and 65535",
        "MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme",
        "JWT_ACCESS_EXPIRES_IN must be a duration such as 15m or 1h",
      ],
    );
  });

  test("normalizes unique Google web client IDs", () => {
    const config = validateEnvironment(
      validEnvironment({
        GOOGLE_CLIENT_IDS:
          "1060222059887-first.apps.googleusercontent.com, 1060222059887-second.apps.googleusercontent.com,1060222059887-first.apps.googleusercontent.com",
      }),
    );

    assert.deepEqual(config.google.clientIds, [
      "1060222059887-first.apps.googleusercontent.com",
      "1060222059887-second.apps.googleusercontent.com",
    ]);
    assert.ok(Object.isFrozen(config.google));
    assert.ok(Object.isFrozen(config.google.clientIds));
  });

  test("requires valid Google web client IDs", () => {
    expectIssues(
      { GOOGLE_CLIENT_IDS: "not-a-google-client" },
      ["GOOGLE_CLIENT_IDS contains an invalid Google client ID"],
    );

    expectIssues(
      { GOOGLE_CLIENT_IDS: "" },
      ["GOOGLE_CLIENT_IDS is required"],
    );
  });

  test("rejects weak or reused JWT secrets", () => {
    expectIssues(
      {
        JWT_ACCESS_SECRET: "same-short-secret",
        JWT_REFRESH_SECRET: "same-short-secret",
      },
      [
        "JWT_ACCESS_SECRET must be at least 32 characters",
        "JWT_REFRESH_SECRET must be at least 32 characters",
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
      ],
    );
  });

  test("rejects unsafe or malformed credentialed origins", () => {
    expectIssues(
      { CORS_ORIGINS: "*,https://app.example.com/path" },
      [
        "CORS_ORIGINS cannot contain * when credentials are enabled",
        "CORS_ORIGINS contains an invalid origin: https://app.example.com/path",
      ],
    );
  });

  test("rejects an empty explicit origin list", () => {
    expectIssues(
      { CORS_ORIGINS: ", ," },
      ["CORS_ORIGINS must contain at least one origin"],
    );
  });

  test("rejects SameSite=None without production secure cookies", () => {
    expectIssues(
      { COOKIE_SAME_SITE: "none" },
      ["COOKIE_SAME_SITE=none requires NODE_ENV=production"],
    );
  });

  test("reports all missing required values without exposing secrets", () => {
    assert.throws(
      () => validateEnvironment({ NODE_ENV: "development" }),
      (error) => {
        assert.ok(error instanceof EnvironmentValidationError);
        assert.ok(error.issues.includes("MONGODB_URI is required"));
        assert.ok(error.issues.includes("JWT_ACCESS_SECRET is required"));
        assert.ok(error.issues.includes("JWT_REFRESH_SECRET is required"));
        assert.ok(error.issues.includes("GOOGLE_CLIENT_IDS is required"));
        assert.ok(error.issues.includes("CLOUDINARY_CLOUD_NAME is required"));
        assert.ok(!error.message.includes("undefined"));
        return true;
      },
    );
  });
});
