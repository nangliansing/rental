import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, afterEach, before, describe, mock, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import { buildGeocodeCacheKey } from "../modules/geocode/cache/build-geocode-cache-key.js";
import { GEOCODE_SOURCE } from "../modules/geocode/geocode.constants.js";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-with-at-least-32-characters";
process.env.GOOGLE_CLIENT_IDS =
  "1060222059887-test.apps.googleusercontent.com";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";
process.env.GEOCODE_ENABLED = "true";
process.env.GOOGLE_MAPS_API_KEY = "test-geocode-key";
process.env.RATE_LIMIT_GEOCODE_MAX = "10";

const reverseGeocodePath = "/api/v1/geocode/reverse";
const bangkokCoords = { lat: 13.756331, lng: 100.501765 };
const nearbyBangkokCoords = { lat: 13.756329, lng: 100.501769 };
const bangkokCacheKey = buildGeocodeCacheKey(bangkokCoords);

assert.equal(
  buildGeocodeCacheKey(nearbyBangkokCoords),
  bangkokCacheKey,
  "nearby coordinates must share the same rounded cache key",
);

let GeocodeCache;
let User;
let USER_STATUSES;
let baseUrl;
let fetchMock;
let httpServer;
let replSet;
let signAccessToken;

const mockState = {
  googlePayload: null,
  googleOk: true,
  googleHttpStatus: 200,
  googleDelayMs: 0,
};

const mockGoogleGeocodeResponse = () => ({
  status: "OK",
  results: [
    {
      formatted_address: "123 Sukhumvit Rd, Bangkok, Thailand",
      place_id: "place-123",
    },
  ],
});

const resolveFetchUrl = (input) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (typeof input?.url === "string") {
    return input.url;
  }

  return String(input);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, headers: response.headers, status: response.status };
};

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const createUserAndToken = async ({
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: "Geocode Test User",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role: "OWNER",
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const postReverseGeocode = (token, body) =>
  request(reverseGeocodePath, {
    method: "POST",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });

const googleFetchCallCount = () =>
  fetchMock.mock.calls.filter((call) =>
    resolveFetchUrl(call.arguments[0]).includes(
      "maps.googleapis.com/maps/api/geocode",
    ),
  ).length;

const googleFetchUrls = () =>
  fetchMock.mock.calls
    .map((call) => resolveFetchUrl(call.arguments[0]))
    .filter((url) => url.includes("maps.googleapis.com/maps/api/geocode"));

const resetGoogleMock = () => {
  mockState.googlePayload = null;
  mockState.googleOk = true;
  mockState.googleHttpStatus = 200;
  mockState.googleDelayMs = 0;
  fetchMock.mock.resetCalls();
};

const expectErrorResponse = (response, { status, code, messagePart = null }) => {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, code);
  assert.equal(typeof response.body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), response.body.requestId);

  if (messagePart) {
    assert.match(response.body.message, messagePart);
  }
};

before(async () => {
  replSet = await MongoMemoryReplSet.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  process.env.MONGODB_URI = replSet.getUri("geocode_reverse_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, userModule, userConstantsModule, geocodeCacheModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/user/user.model.js"),
      import("../modules/user/user.constants.js"),
      import("../modules/geocode/cache/geocode-cache.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  User = userModule.default;
  USER_STATUSES = userConstantsModule.USER_STATUSES;
  GeocodeCache = geocodeCacheModule.default;

  const originalFetch = globalThis.fetch;
  fetchMock = mock.method(globalThis, "fetch", async (input, init) => {
    const url = resolveFetchUrl(input);

    if (url.includes("maps.googleapis.com/maps/api/geocode")) {
      if (mockState.googleDelayMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, mockState.googleDelayMs);
        });
      }

      return {
        ok: mockState.googleOk,
        status: mockState.googleHttpStatus,
        json: async () => mockState.googlePayload ?? mockGoogleGeocodeResponse(),
      };
    }

    return originalFetch(input, init);
  });

  httpServer = createServer(appModule.createApp({ config }));
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(async () => {
  resetGoogleMock();

  if (mongoose.connection.readyState !== 1) return;

  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

after(async () => {
  if (fetchMock) {
    fetchMock.mock.restore();
  }

  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await mongoose.disconnect();
  await replSet?.stop();
});

describe("POST /api/v1/geocode/reverse", () => {
  describe("authentication and authorization", () => {
    test("requires authentication", async () => {
      const response = await request(reverseGeocodePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bangkokCoords),
      });

      expectErrorResponse(response, {
        status: 401,
        code: "ACCESS_TOKEN_REQUIRED",
        messagePart: /Access token is required/,
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("rejects invalid access tokens", async () => {
      const response = await postReverseGeocode("not-a-valid-token", bangkokCoords);

      expectErrorResponse(response, {
        status: 401,
        code: "INVALID_ACCESS_TOKEN",
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("requires an active user", async () => {
      const { token } = await createUserAndToken({
        status: USER_STATUSES.SUSPENDED,
      });

      const response = await postReverseGeocode(token, bangkokCoords);

      expectErrorResponse(response, {
        status: 403,
        code: "ACCOUNT_SUSPENDED",
      });
      assert.equal(googleFetchCallCount(), 0);
    });
  });

  describe("request validation", () => {
    test("validates latitude range", async () => {
      const { token } = await createUserAndToken();

      const response = await postReverseGeocode(token, {
        lat: 120,
        lng: 100.5018,
      });

      expectErrorResponse(response, {
        status: 422,
        code: "VALIDATION_ERROR",
        messagePart: /lat must be between -90 and 90/,
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("rejects missing latitude", async () => {
      const { token } = await createUserAndToken();

      const response = await postReverseGeocode(token, { lng: 100.501765 });

      expectErrorResponse(response, {
        status: 422,
        code: "VALIDATION_ERROR",
        messagePart: /lat is required/,
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("rejects missing longitude", async () => {
      const { token } = await createUserAndToken();

      const response = await postReverseGeocode(token, { lat: 13.756331 });

      expectErrorResponse(response, {
        status: 422,
        code: "VALIDATION_ERROR",
        messagePart: /lng is required/,
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("rejects an empty request body", async () => {
      const { token } = await createUserAndToken();

      const response = await request(reverseGeocodePath, {
        method: "POST",
        headers: bearerHeaders(token),
        body: JSON.stringify({}),
      });

      expectErrorResponse(response, {
        status: 422,
        code: "VALIDATION_ERROR",
      });
      assert.equal(googleFetchCallCount(), 0);
    });

    test("rejects invalid JSON bodies", async () => {
      const { token } = await createUserAndToken();

      const response = await request(reverseGeocodePath, {
        method: "POST",
        headers: bearerHeaders(token),
        body: "{ lat: 13.756331 }",
      });

      expectErrorResponse(response, {
        status: 400,
        code: "INVALID_JSON",
        messagePart: /valid JSON/,
      });
      assert.equal(googleFetchCallCount(), 0);
    });
  });

  describe("successful reverse geocoding", () => {
    test("returns the full reverse geocode contract", async () => {
      const { token } = await createUserAndToken();

      const response = await postReverseGeocode(token, bangkokCoords);

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.formattedAddress, "123 Sukhumvit Rd, Bangkok, Thailand");
      assert.equal(response.body.data.placeId, "place-123");
      assert.equal(response.body.data.source, GEOCODE_SOURCE.GOOGLE);
      assert.equal(response.body.data.cached, false);
      assert.equal(response.body.data.lat, 13.75633);
      assert.equal(response.body.data.lng, 100.50177);
      assert.match(response.body.data.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(googleFetchCallCount(), 1);
      assert.doesNotMatch(JSON.stringify(response.body), /test-geocode-key/);
    });

    test("returns a formatted address from Google and caches the result", async () => {
      const { token } = await createUserAndToken();

      const firstResponse = await postReverseGeocode(token, bangkokCoords);

      assert.equal(firstResponse.status, 200);
      assert.equal(firstResponse.body.data.cached, false);
      assert.equal(googleFetchCallCount(), 1);

      const secondResponse = await postReverseGeocode(token, bangkokCoords);

      assert.equal(secondResponse.status, 200);
      assert.equal(secondResponse.body.data.cached, true);
      assert.equal(googleFetchCallCount(), 1);

      const cacheCount = await GeocodeCache.countDocuments();
      assert.equal(cacheCount, 1);
    });

    test("serves nearby coordinates from the same cache entry", async () => {
      const { token } = await createUserAndToken();

      const firstResponse = await postReverseGeocode(token, bangkokCoords);
      const secondResponse = await postReverseGeocode(token, nearbyBangkokCoords);

      assert.equal(firstResponse.body.data.cached, false);
      assert.equal(secondResponse.body.data.cached, true);
      assert.equal(
        secondResponse.body.data.formattedAddress,
        firstResponse.body.data.formattedAddress,
      );
      assert.equal(googleFetchCallCount(), 1);
      assert.equal(await GeocodeCache.countDocuments(), 1);
    });

    test("persists rounded cache metadata in MongoDB", async () => {
      const { token } = await createUserAndToken();

      await postReverseGeocode(token, bangkokCoords);

      const cached = await GeocodeCache.findOne({ cacheKey: bangkokCacheKey }).lean();

      assert.ok(cached);
      assert.equal(cached.cacheKey, bangkokCacheKey);
      assert.equal(cached.lat, 13.75633);
      assert.equal(cached.lng, 100.50177);
      assert.equal(cached.formattedAddress, "123 Sukhumvit Rd, Bangkok, Thailand");
      assert.equal(cached.placeId, "place-123");
      assert.ok(cached.fetchedAt instanceof Date);
      assert.ok(cached.expiresAt instanceof Date);
      assert.ok(cached.expiresAt > cached.fetchedAt);
    });

    test("calls Google with rounded coordinates and the configured API key", async () => {
      const { token } = await createUserAndToken();

      await postReverseGeocode(token, bangkokCoords);

      assert.equal(googleFetchCallCount(), 1);

      const googleUrl = new URL(googleFetchUrls()[0]);

      assert.equal(
        googleUrl.origin + googleUrl.pathname,
        "https://maps.googleapis.com/maps/api/geocode/json",
      );
      assert.equal(googleUrl.searchParams.get("latlng"), "13.75633,100.50177");
      assert.equal(googleUrl.searchParams.get("key"), "test-geocode-key");
    });

    test("dedupes concurrent Google calls for the same cache key", async () => {
      mockState.googleDelayMs = 40;

      const { token } = await createUserAndToken();
      const headers = bearerHeaders(token);

      const [firstResponse, secondResponse] = await Promise.all([
        request(reverseGeocodePath, {
          method: "POST",
          headers,
          body: JSON.stringify(bangkokCoords),
        }),
        request(reverseGeocodePath, {
          method: "POST",
          headers,
          body: JSON.stringify(nearbyBangkokCoords),
        }),
      ]);

      assert.equal(firstResponse.status, 200);
      assert.equal(secondResponse.status, 200);
      assert.equal(firstResponse.body.data.cached, false);
      assert.equal(secondResponse.body.data.cached, false);
      assert.deepEqual(
        firstResponse.body.data.formattedAddress,
        secondResponse.body.data.formattedAddress,
      );
      assert.equal(googleFetchCallCount(), 1);
      assert.equal(await GeocodeCache.countDocuments(), 1);
    });
  });

  describe("provider failure handling", () => {
    test("returns GEOCODE_NOT_FOUND when Google has no results", async () => {
      mockState.googlePayload = {
        status: "ZERO_RESULTS",
        results: [],
      };

      const { token } = await createUserAndToken();
      const response = await postReverseGeocode(token, bangkokCoords);

      expectErrorResponse(response, {
        status: 404,
        code: "GEOCODE_NOT_FOUND",
        messagePart: /No address was found for the provided coordinates/,
      });
      assert.doesNotMatch(JSON.stringify(response.body), /test-geocode-key/);
      assert.equal(await GeocodeCache.countDocuments(), 0);
    });

    test("returns GEOCODE_UNAVAILABLE when Google responds with a non-success HTTP status", async () => {
      mockState.googleOk = false;
      mockState.googleHttpStatus = 503;

      const { token } = await createUserAndToken();
      const response = await postReverseGeocode(token, bangkokCoords);

      expectErrorResponse(response, {
        status: 503,
        code: "GEOCODE_UNAVAILABLE",
        messagePart: /temporarily unavailable/,
      });
      assert.equal(await GeocodeCache.countDocuments(), 0);
    });

    test("returns GEOCODE_UNAVAILABLE when Google returns OVER_QUERY_LIMIT", async () => {
      mockState.googlePayload = {
        status: "OVER_QUERY_LIMIT",
      };

      const { token } = await createUserAndToken();
      const response = await postReverseGeocode(token, bangkokCoords);

      expectErrorResponse(response, {
        status: 503,
        code: "GEOCODE_UNAVAILABLE",
        messagePart: /temporarily unavailable/,
      });
      assert.equal(await GeocodeCache.countDocuments(), 0);
    });
  });

  describe("rate limiting", () => {
    test("applies the geocode rate limit per authenticated user", async () => {
      const { token } = await createUserAndToken();
      const headers = bearerHeaders(token);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await request(reverseGeocodePath, {
          method: "POST",
          headers,
          body: JSON.stringify({
            lat: 13.75 + attempt * 0.00001,
            lng: 100.5018,
          }),
        });

        assert.equal(response.status, 200);
      }

      const limitedResponse = await request(reverseGeocodePath, {
        method: "POST",
        headers,
        body: JSON.stringify({ lat: 13.76001, lng: 100.5018 }),
      });

      expectErrorResponse(limitedResponse, {
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        messagePart: /Too many requests/,
      });
      assert.ok(limitedResponse.headers.get("ratelimit"));
    });

    test("does not share geocode rate limits across different users", async () => {
      const firstUser = await createUserAndToken();
      const secondUser = await createUserAndToken();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await postReverseGeocode(firstUser.token, {
          lat: 13.75 + attempt * 0.00001,
          lng: 100.5018,
        });

        assert.equal(response.status, 200);
      }

      const limitedResponse = await postReverseGeocode(firstUser.token, {
        lat: 13.76001,
        lng: 100.5018,
      });

      expectErrorResponse(limitedResponse, {
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
      });

      const secondUserResponse = await postReverseGeocode(
        secondUser.token,
        bangkokCoords,
      );

      assert.equal(secondUserResponse.status, 200);
      assert.equal(secondUserResponse.body.success, true);
    });
  });
});
