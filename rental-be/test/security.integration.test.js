import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, test } from "node:test";

import { createApp } from "../app.js";
import { validateEnvironment } from "../config/environment.js";
import { createRuntimeHealth } from "../shared/runtime/index.js";

const baseEnvironment = (overrides = {}) => ({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/security_test",
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

const withServer = async (environmentOverrides, callback, appOptions = {}) => {
  const config = validateEnvironment(baseEnvironment(environmentOverrides));
  const server = createServer(createApp({ config, ...appOptions }));

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

const expectRateLimited = async (response) => {
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("ratelimit"));
  const body = await response.json();
  assert.equal(typeof body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), body.requestId);
  assert.deepEqual(body, {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
    requestId: body.requestId,
  });
};

describe("HTTP security boundary", () => {
  test("sets security headers without exposing Express", async () => {
    await withServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.ok(response.headers.get("content-security-policy"));
      assert.equal(response.headers.get("x-powered-by"), null);
      assert.equal(response.headers.get("ratelimit"), null);
    });
  });

  test("reports readiness transitions without failing liveness", async () => {
    const runtimeHealth = createRuntimeHealth();

    await withServer(
      {},
      async (baseUrl) => {
        const notReady = await fetch(`${baseUrl}/health/ready`);
        const live = await fetch(`${baseUrl}/health/live`);

        assert.equal(notReady.status, 503);
        const notReadyBody = await notReady.json();
        assert.equal(typeof notReadyBody.requestId, "string");
        assert.deepEqual(notReadyBody, {
          success: false,
          code: "SERVICE_NOT_READY",
          message: "Service is not ready",
          requestId: notReadyBody.requestId,
        });
        assert.equal(live.status, 200);

        runtimeHealth.markReady();
        assert.equal((await fetch(`${baseUrl}/health/ready`)).status, 200);

        runtimeHealth.markShuttingDown();
        assert.equal((await fetch(`${baseUrl}/health/ready`)).status, 503);
        assert.equal((await fetch(`${baseUrl}/health/live`)).status, 200);
      },
      { runtimeHealth },
    );
  });

  test("rate limits GET requests through the global policy", async () => {
    await withServer({ RATE_LIMIT_GLOBAL_MAX: "2" }, async (baseUrl) => {
      const url = `${baseUrl}/does-not-exist`;

      assert.equal((await fetch(url)).status, 404);
      assert.equal((await fetch(url)).status, 404);
      await expectRateLimited(await fetch(url));
    });
  });

  test("applies the API read policy to GET requests", async () => {
    await withServer({ RATE_LIMIT_READ_MAX: "2" }, async (baseUrl) => {
      const url = `${baseUrl}/api/v1/does-not-exist`;

      assert.equal((await fetch(url)).status, 404);
      assert.equal((await fetch(url)).status, 404);
      await expectRateLimited(await fetch(url));
    });
  });

  test("applies a stricter policy to public search", async () => {
    await withServer({ RATE_LIMIT_SEARCH_MAX: "2" }, async (baseUrl) => {
      const url = `${baseUrl}/api/v1/search/agents?page=invalid`;

      assert.equal((await fetch(url)).status, 422);
      assert.equal((await fetch(url)).status, 422);
      await expectRateLimited(await fetch(url));
    });
  });

  test("applies the API mutation policy to non-GET methods", async () => {
    await withServer({ RATE_LIMIT_MUTATION_MAX: "2" }, async (baseUrl) => {
      const send = () =>
        fetch(`${baseUrl}/api/v1/does-not-exist`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });

      assert.equal((await send()).status, 404);
      assert.equal((await send()).status, 404);
      await expectRateLimited(await send());
    });
  });

  test("applies the authentication policy before account lookup", async () => {
    await withServer({ RATE_LIMIT_AUTH_MAX: "2" }, async (baseUrl) => {
      const send = () =>
        fetch(`${baseUrl}/api/v1/users/token/refresh`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });

      assert.equal((await send()).status, 401);
      assert.equal((await send()).status, 401);
      await expectRateLimited(await send());
    });
  });

  test("rejects oversized JSON with the standard response", async () => {
    await withServer({ JSON_BODY_LIMIT: "1kb" }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/does-not-exist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(2048) }),
      });

      assert.equal(response.status, 413);
      const body = await response.json();
      assert.equal(typeof body.requestId, "string");
      assert.deepEqual(body, {
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large",
        requestId: body.requestId,
      });
    });
  });
});
