import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, test } from "node:test";

import { createApp } from "../app.js";
import { validateEnvironment } from "../config/environment.js";
import {
  globalRateLimit,
  initializeRateLimiters,
  isSearchApiRequest,
  mutationRateLimit,
  readRateLimit,
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

const createCountingStoreFactory = () => {
  const incrementsByPrefix = {};

  return {
    incrementsByPrefix,
    createStore: (prefix) => ({
      localKeys: true,
      init: async () => {},
      get: async () => undefined,
      increment: async () => {
        incrementsByPrefix[prefix] = (incrementsByPrefix[prefix] ?? 0) + 1;
        return {
          totalHits: incrementsByPrefix[prefix],
          resetTime: new Date(Date.now() + minute),
        };
      },
      decrement: async () => {},
      resetKey: async () => {},
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
      middleware(req, response, finish);
    } catch (error) {
      finish(error);
    }
  });

  return response;
};

const withAppServer = async (environmentOverrides, callback) => {
  const config = validateEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:27017/search_skip_test",
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

  const server = createServer(createApp({ config }));

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

describe("isSearchApiRequest", () => {
  test("matches canonical search API paths", () => {
    for (const originalUrl of [
      "/api/v1/search",
      "/api/v1/search/",
      "/api/v1/search/buildings/map",
      "/api/v1/search/agents",
      "/api/v1/search/agents/abc",
      "/api/v1/search/listings/xyz",
      "/api/v1/agent-demand-opportunities/search",
      "/api/v1/agent-demand-opportunities/search/",
    ]) {
      assert.equal(
        isSearchApiRequest({ originalUrl }),
        true,
        originalUrl,
      );
    }
  });

  test("strips query strings before matching", () => {
    assert.equal(
      isSearchApiRequest({
        originalUrl: "/api/v1/search/agents?page=1&sort=name",
      }),
      true,
    );
    assert.equal(
      isSearchApiRequest({ originalUrl: "/api/v1/users/me?search=1" }),
      false,
    );
  });

  test("prefers originalUrl over url", () => {
    assert.equal(
      isSearchApiRequest({
        originalUrl: "/api/v1/search/buildings/map",
        url: "/buildings/map",
      }),
      true,
    );
    assert.equal(
      isSearchApiRequest({
        originalUrl: "/api/v1/users/me",
        url: "/api/v1/search/buildings/map",
      }),
      false,
    );
  });

  test("falls back to url when originalUrl is absent", () => {
    assert.equal(
      isSearchApiRequest({ url: "/api/v1/search/buildings/nearby" }),
      true,
    );
    assert.equal(isSearchApiRequest({ url: "/api/v1/listings" }), false);
  });

  test("rejects lookalike and non-search paths", () => {
    for (const originalUrl of [
      "/api/v1/searching",
      "/api/v1/searching/buildings",
      "/api/v2/search/buildings/map",
      "/api/v1/saved-searches/search",
      "/api/v1/agent-demand-opportunities/searching",
      "/search/buildings/map",
      "/api/v1/users/me",
      "/health",
      "/api/v1/search-extra",
      "",
    ]) {
      assert.equal(
        isSearchApiRequest({ originalUrl }),
        false,
        originalUrl || "(empty)",
      );
    }
  });

  test("tolerates missing request objects", () => {
    assert.equal(isSearchApiRequest(undefined), false);
    assert.equal(isSearchApiRequest(null), false);
    assert.equal(isSearchApiRequest({}), false);
  });
});

describe("search route limiter store skips", () => {
  test("search traffic increments only the search store", async () => {
    const { createStore, incrementsByPrefix } = createCountingStoreFactory();
    initializeRateLimiters({
      config: baseRateLimitConfig,
      createStore,
    });

    const searchReq = {
      ip: "203.0.113.10",
      method: "POST",
      originalUrl: "/api/v1/search/buildings/map",
      url: "/api/v1/search/buildings/map",
      headers: {},
      app: { get: () => undefined },
    };

    await invokeMiddleware(globalRateLimit, searchReq);
    await invokeMiddleware(readRateLimit, searchReq);
    await invokeMiddleware(mutationRateLimit, searchReq);
    await invokeMiddleware(searchRateLimit, searchReq);

    assert.deepEqual(incrementsByPrefix, { search: 1 });
  });

  test("non-search GET increments global and read stores only", async () => {
    const { createStore, incrementsByPrefix } = createCountingStoreFactory();
    initializeRateLimiters({
      config: baseRateLimitConfig,
      createStore,
    });

    const getReq = {
      ip: "203.0.113.11",
      method: "GET",
      originalUrl: "/api/v1/users/me",
      url: "/api/v1/users/me",
      headers: {},
      app: { get: () => undefined },
    };

    // Mirrors app stack for a non-search GET: global → read → mutation.
    await invokeMiddleware(globalRateLimit, getReq);
    await invokeMiddleware(readRateLimit, getReq);
    await invokeMiddleware(mutationRateLimit, getReq);

    assert.deepEqual(incrementsByPrefix, {
      global: 1,
      read: 1,
    });
  });

  test("non-search POST increments global and mutation stores only", async () => {
    const { createStore, incrementsByPrefix } = createCountingStoreFactory();
    initializeRateLimiters({
      config: baseRateLimitConfig,
      createStore,
    });

    const postReq = {
      ip: "203.0.113.12",
      method: "POST",
      originalUrl: "/api/v1/listings",
      url: "/api/v1/listings",
      headers: {},
      app: { get: () => undefined },
    };

    await invokeMiddleware(globalRateLimit, postReq);
    await invokeMiddleware(readRateLimit, postReq);
    await invokeMiddleware(mutationRateLimit, postReq);

    assert.deepEqual(incrementsByPrefix, {
      global: 1,
      mutation: 1,
    });
  });

  test("search GET still uses only the search store across the full stack", async () => {
    const { createStore, incrementsByPrefix } = createCountingStoreFactory();
    initializeRateLimiters({
      config: baseRateLimitConfig,
      createStore,
    });

    const getSearchReq = {
      ip: "203.0.113.13",
      method: "GET",
      originalUrl: "/api/v1/search/agents?page=1",
      url: "/api/v1/search/agents?page=1",
      headers: {},
      app: { get: () => undefined },
    };

    await invokeMiddleware(globalRateLimit, getSearchReq);
    await invokeMiddleware(readRateLimit, getSearchReq);
    await invokeMiddleware(mutationRateLimit, getSearchReq);
    await invokeMiddleware(searchRateLimit, getSearchReq);

    assert.deepEqual(incrementsByPrefix, { search: 1 });
  });
});

describe("search skip HTTP matrix", () => {
  test("search remains governed by the search quota alone", async () => {
    await withAppServer(
      {
        RATE_LIMIT_GLOBAL_MAX: "2",
        RATE_LIMIT_READ_MAX: "2",
        RATE_LIMIT_MUTATION_MAX: "2",
        RATE_LIMIT_SEARCH_MAX: "3",
      },
      async (baseUrl) => {
        const url = `${baseUrl}/api/v1/search/agents?page=invalid`;

        assert.equal((await fetch(url)).status, 422);
        assert.equal((await fetch(url)).status, 422);
        assert.equal((await fetch(url)).status, 422);

        const limited = await fetch(url);
        assert.equal(limited.status, 429);
        const body = await limited.json();
        assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
      },
    );
  });

  test("exhausted global quota still allows search", async () => {
    await withAppServer(
      {
        RATE_LIMIT_GLOBAL_MAX: "2",
        RATE_LIMIT_SEARCH_MAX: "50",
        RATE_LIMIT_READ_MAX: "50",
        RATE_LIMIT_MUTATION_MAX: "50",
      },
      async (baseUrl) => {
        const burn = `${baseUrl}/does-not-exist`;
        assert.equal((await fetch(burn)).status, 404);
        assert.equal((await fetch(burn)).status, 404);
        assert.equal((await fetch(burn)).status, 429);

        const search = await fetch(
          `${baseUrl}/api/v1/search/agents?page=invalid`,
        );
        assert.equal(search.status, 422);
      },
    );
  });

  test("exhausted mutation quota still allows search POST", async () => {
    await withAppServer(
      {
        RATE_LIMIT_GLOBAL_MAX: "50",
        RATE_LIMIT_MUTATION_MAX: "2",
        RATE_LIMIT_SEARCH_MAX: "50",
      },
      async (baseUrl) => {
        const burn = () =>
          fetch(`${baseUrl}/api/v1/does-not-exist`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          });

        assert.equal((await burn()).status, 404);
        assert.equal((await burn()).status, 404);
        assert.equal((await burn()).status, 429);

        const search = await fetch(`${baseUrl}/api/v1/search/buildings/map`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        assert.ok([400, 422].includes(search.status));
      },
    );
  });

  test("exhausted read quota still allows search GET", async () => {
    await withAppServer(
      {
        RATE_LIMIT_GLOBAL_MAX: "50",
        RATE_LIMIT_READ_MAX: "2",
        RATE_LIMIT_SEARCH_MAX: "50",
      },
      async (baseUrl) => {
        const burn = `${baseUrl}/api/v1/does-not-exist`;
        assert.equal((await fetch(burn)).status, 404);
        assert.equal((await fetch(burn)).status, 404);
        assert.equal((await fetch(burn)).status, 429);

        const search = await fetch(
          `${baseUrl}/api/v1/search/agents?page=invalid`,
        );
        assert.equal(search.status, 422);
      },
    );
  });

  test("non-search routes still stack global and mutation quotas", async () => {
    await withAppServer(
      {
        RATE_LIMIT_GLOBAL_MAX: "50",
        RATE_LIMIT_MUTATION_MAX: "2",
        RATE_LIMIT_SEARCH_MAX: "50",
      },
      async (baseUrl) => {
        const send = () =>
          fetch(`${baseUrl}/api/v1/listings`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          });

        assert.ok((await send()).status !== 429);
        assert.ok((await send()).status !== 429);
        assert.equal((await send()).status, 429);
      },
    );
  });
});
