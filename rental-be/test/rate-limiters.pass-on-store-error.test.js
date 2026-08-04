import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, test } from "node:test";

import { createApp } from "../app.js";
import { validateEnvironment } from "../config/environment.js";
import {
  globalRateLimit,
  initializeRateLimiters,
  searchRateLimit,
} from "../shared/security/rate-limiters.js";

const minute = 60 * 1000;

const baseRateLimitConfig = {
  globalMax: 1000,
  readMax: 1000,
  searchMax: 1000,
  authMax: 1000,
  mutationMax: 1000,
  sensitiveActionMax: 1000,
  uploadMax: 1000,
  adminMutationMax: 1000,
  geocodeMax: 1000,
};

const createThrowingStoreFactory = ({
  error = new Error(
    "ERR max requests limit exceeded. Limit: 500000, Usage: 500000.",
  ),
  failOnIncrementNumber = 1,
} = {}) => {
  let incrementCount = 0;

  return {
    getIncrementCount: () => incrementCount,
    createStore: () => ({
      localKeys: true,
      init: async () => {},
      get: async () => undefined,
      increment: async () => {
        incrementCount += 1;
        if (incrementCount >= failOnIncrementNumber) {
          throw error;
        }

        return {
          totalHits: incrementCount,
          resetTime: new Date(Date.now() + minute),
        };
      },
      decrement: async () => {},
      resetKey: async () => {},
      shutdown: async () => {},
    }),
  };
};

const createCountingStoreFactory = () => {
  const hitsByKey = new Map();

  return {
    createStore: () => ({
      localKeys: true,
      init: async () => {},
      get: async (key) => {
        const totalHits = hitsByKey.get(key) ?? 0;
        return {
          totalHits,
          resetTime: new Date(Date.now() + minute),
        };
      },
      increment: async (key) => {
        const totalHits = (hitsByKey.get(key) ?? 0) + 1;
        hitsByKey.set(key, totalHits);
        return {
          totalHits,
          resetTime: new Date(Date.now() + minute),
        };
      },
      decrement: async () => {},
      resetKey: async (key) => {
        hitsByKey.delete(key);
      },
      shutdown: async () => {},
    }),
  };
};

const invokeMiddleware = async (middleware, req) => {
  const response = {
    statusCode: 200,
    body: undefined,
    headers: Object.create(null),
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[String(name).toLowerCase()];
    },
    append(name, value) {
      const key = String(name).toLowerCase();
      const current = this.headers[key];
      this.headers[key] =
        current === undefined ? value : `${current}, ${value}`;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  let nextCalled = false;

  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    const originalJson = response.json.bind(response);
    response.json = (body) => {
      originalJson(body);
      finish();
      return response;
    };

    try {
      middleware(req, response, (error) => {
        nextCalled = true;
        finish(error);
      });
    } catch (error) {
      finish(error);
    }
  });

  return { response, nextCalled };
};

const buildRequest = ({
  ip = "198.51.100.10",
  method = "GET",
  originalUrl = "/healthcheck-path",
} = {}) => ({
  ip,
  method,
  originalUrl,
  url: originalUrl,
  headers: {},
  app: { get: () => undefined },
});

const withAppServer = async (
  { environmentOverrides = {}, createRateLimitStore } = {},
  callback,
) => {
  const config = validateEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:27017/pass_on_store_error_test",
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
    ...environmentOverrides,
  });

  const server = createServer(
    createApp({
      config,
      ...(createRateLimitStore ? { createRateLimitStore } : {}),
    }),
  );

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

describe("passOnStoreError fail-open", () => {
  test("global limiter calls next when the store throws", async () => {
    const { createStore, getIncrementCount } = createThrowingStoreFactory();
    initializeRateLimiters({
      config: { ...baseRateLimitConfig, globalMax: 1 },
      createStore,
    });

    const { response, nextCalled } = await invokeMiddleware(
      globalRateLimit,
      buildRequest({ originalUrl: "/anything" }),
    );

    assert.equal(nextCalled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, undefined);
    assert.equal(getIncrementCount(), 1);
  });

  test("search limiter calls next when Upstash quota errors are thrown", async () => {
    const { createStore } = createThrowingStoreFactory({
      error: new Error(
        "ERR max requests limit exceeded. Limit: 500000, Usage: 500000.",
      ),
    });
    initializeRateLimiters({
      config: { ...baseRateLimitConfig, searchMax: 1 },
      createStore,
    });

    const { response, nextCalled } = await invokeMiddleware(
      searchRateLimit,
      buildRequest({
        method: "POST",
        originalUrl: "/api/v1/search/buildings/map",
      }),
    );

    assert.equal(nextCalled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, undefined);
  });

  test("fail-open still allows later requests after a store fault", async () => {
    const { createStore, getIncrementCount } = createThrowingStoreFactory({
      failOnIncrementNumber: 1,
    });
    initializeRateLimiters({
      config: { ...baseRateLimitConfig, globalMax: 1 },
      createStore,
    });

    const first = await invokeMiddleware(
      globalRateLimit,
      buildRequest({ ip: "198.51.100.20" }),
    );
    const second = await invokeMiddleware(
      globalRateLimit,
      buildRequest({ ip: "198.51.100.21" }),
    );

    assert.equal(first.nextCalled, true);
    assert.equal(second.nextCalled, true);
    assert.equal(getIncrementCount(), 2);
  });

  test("healthy store still enforces 429 once the quota is exceeded", async () => {
    const { createStore } = createCountingStoreFactory();
    initializeRateLimiters({
      config: { ...baseRateLimitConfig, globalMax: 2 },
      createStore,
    });

    const req = buildRequest({ ip: "198.51.100.30", originalUrl: "/probe" });

    const first = await invokeMiddleware(globalRateLimit, req);
    const second = await invokeMiddleware(globalRateLimit, req);
    const third = await invokeMiddleware(globalRateLimit, req);

    assert.equal(first.nextCalled, true);
    assert.equal(second.nextCalled, true);
    assert.equal(third.nextCalled, false);
    assert.equal(third.response.statusCode, 429);
    assert.equal(third.response.body.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(third.response.body.success, false);
  });

  test("HTTP layer stays available when Redis store increments fail", async () => {
    const { createStore } = createThrowingStoreFactory();

    await withAppServer(
      {
        environmentOverrides: {
          RATE_LIMIT_GLOBAL_MAX: "1",
          RATE_LIMIT_SEARCH_MAX: "1",
        },
        createRateLimitStore: createStore,
      },
      async (baseUrl) => {
        const health = await fetch(`${baseUrl}/health`);
        assert.equal(health.status, 200);

        const missing = await fetch(`${baseUrl}/does-not-exist`);
        assert.equal(missing.status, 404);

        const search = await fetch(
          `${baseUrl}/api/v1/search/agents?page=invalid`,
        );
        assert.equal(search.status, 422);

        // Even at max=1, store faults must not flip into 429/500.
        const again = await fetch(`${baseUrl}/does-not-exist`);
        assert.equal(again.status, 404);
      },
    );
  });

  test("HTTP layer still rate-limits when the store is healthy", async () => {
    const { createStore } = createCountingStoreFactory();

    await withAppServer(
      {
        environmentOverrides: {
          RATE_LIMIT_GLOBAL_MAX: "2",
        },
        createRateLimitStore: createStore,
      },
      async (baseUrl) => {
        const url = `${baseUrl}/does-not-exist`;
        assert.equal((await fetch(url)).status, 404);
        assert.equal((await fetch(url)).status, 404);

        const limited = await fetch(url);
        assert.equal(limited.status, 429);
        const body = await limited.json();
        assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
      },
    );
  });

  test("store errors are not converted into Express error middleware 500s", async () => {
    const { createStore } = createThrowingStoreFactory({
      error: Object.assign(new Error("Connection is closed."), {
        name: "ReplyError",
      }),
    });

    await withAppServer(
      {
        createRateLimitStore: createStore,
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/does-not-exist`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });

        assert.equal(response.status, 404);
        const body = await response.json();
        assert.equal(body.code, "NOT_FOUND");
        assert.notEqual(body.code, "INTERNAL_ERROR");
      },
    );
  });
});
