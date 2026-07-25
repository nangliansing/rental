import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, test } from "node:test";

import { createApp } from "../app.js";
import { validateEnvironment } from "../config/environment.js";
import {
  createLogger,
  normalizeHttpPath,
} from "../shared/observability/index.js";

const baseEnvironment = (overrides = {}) => ({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/observability_test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  GOOGLE_CLIENT_IDS: "1060222059887-test.apps.googleusercontent.com",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  RATE_LIMIT_GLOBAL_MAX: "100",
  RATE_LIMIT_READ_MAX: "100",
  RATE_LIMIT_SEARCH_MAX: "100",
  RATE_LIMIT_AUTH_MAX: "100",
  RATE_LIMIT_MUTATION_MAX: "100",
  ...overrides,
});

const collectLogs = () => {
  const destination = new PassThrough();
  let output = "";
  destination.on("data", (chunk) => {
    output += chunk.toString();
  });

  return {
    destination,
    read: () => output,
  };
};

describe("observability", () => {
  test("redacts sensitive values from structured logs", () => {
    const logs = collectLogs();
    const logger = createLogger({
      destination: logs.destination,
      environment: "test",
      level: "info",
    });

    logger.info({
      authorization: "Bearer secret-access-token",
      password: "secret-password",
      config: {
        cloudinary: { apiSecret: "secret-cloudinary-value" },
        metrics: { token: "secret-metrics-token" },
      },
    });

    const output = logs.read();
    assert.match(output, /\[REDACTED\]/);
    assert.doesNotMatch(output, /secret-access-token/);
    assert.doesNotMatch(output, /secret-password/);
    assert.doesNotMatch(output, /secret-cloudinary-value/);
    assert.doesNotMatch(output, /secret-metrics-token/);
  });

  test("logs controlled request fields without query or credential values", async () => {
    const logs = collectLogs();
    const logger = createLogger({
      destination: logs.destination,
      environment: "test",
      level: "info",
    });
    const config = validateEnvironment(baseEnvironment());
    const app = createApp({ config, logger });
    const server = app.listen(0, "127.0.0.1");

    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    try {
      const { port } = server.address();
      const response = await fetch(
        `http://127.0.0.1:${port}/does-not-exist?secret=query-secret`,
        {
          headers: {
            authorization: "Bearer header-secret",
            "x-request-id": "observability-test-request",
          },
        },
      );
      await response.text();
      await new Promise((resolve) => setImmediate(resolve));

      const output = logs.read();
      assert.match(output, /http_request_completed/);
      assert.match(output, /observability-test-request/);
      assert.doesNotMatch(output, /query-secret/);
      assert.doesNotMatch(output, /header-secret/);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  test("protects metrics and exposes bounded HTTP and dependency metrics", async () => {
    const metricsToken = "test-metrics-token";
    const config = validateEnvironment(
      baseEnvironment({ METRICS_TOKEN: metricsToken }),
    );
    const app = createApp({ config });
    const server = app.listen(0, "127.0.0.1");

    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    try {
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;

      await fetch(`${baseUrl}/does-not-exist`);

      const denied = await fetch(`${baseUrl}/metrics`);
      assert.equal(denied.status, 401);
      const deniedBody = await denied.json();
      assert.equal(deniedBody.code, "METRICS_ACCESS_DENIED");
      assert.equal(typeof deniedBody.requestId, "string");

      const allowed = await fetch(`${baseUrl}/metrics`, {
        headers: { authorization: `Bearer ${metricsToken}` },
      });
      assert.equal(allowed.status, 200);
      const body = await allowed.text();
      assert.match(body, /rental_http_requests_total/);
      assert.match(body, /route="unmatched"/);
      assert.match(body, /rental_dependency_ready\{dependency="mongodb"\} 1/);
      assert.match(
        body,
        /rental_dependency_ready\{dependency="rate_limit_store"\} 1/,
      );
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  test("uses route templates instead of identifiers as metric labels", () => {
    assert.equal(
      normalizeHttpPath({
        baseUrl: "/api/v1/listings",
        path: "/6a57d0e4947d934e03495b84",
        route: { path: "/:listingId" },
      }),
      "/api/v1/listings/:listingId",
    );
  });
});
