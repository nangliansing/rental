import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";
import { buildGeocodeCacheKey } from "../cache/build-geocode-cache-key.js";
import { GEOCODE_SOURCE } from "../geocode.constants.js";

const FIXED_NOW = new Date("2026-08-02T05:00:00.000Z");

const mockState = {
  cacheByKey: new Map(),
  findCalls: [],
  upsertCalls: [],
  googleCalls: [],
  googleDelayMs: 0,
  googleResult: {
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
  },
  googleError: null,
  cacheTtlDays: 30,
};

mock.module("../cache/geocode-cache.repository.js", {
  namedExports: {
    findGeocodeCacheByKey: async ({ cacheKey, session = null }) => {
      mockState.findCalls.push({ cacheKey, session });
      return mockState.cacheByKey.get(cacheKey) ?? null;
    },
    upsertGeocodeCache: async (input) => {
      mockState.upsertCalls.push(input);
      mockState.cacheByKey.set(input.cacheKey, {
        cacheKey: input.cacheKey,
        lat: input.lat,
        lng: input.lng,
        formattedAddress: input.formattedAddress,
        placeId: input.placeId,
        fetchedAt: input.fetchedAt,
        expiresAt: input.expiresAt,
      });
      return input;
    },
  },
});

mock.module("../providers/google-reverse-geocoding.provider.js", {
  namedExports: {
    queryGoogleReverseGeocoding: async ({ lat, lng }) => {
      mockState.googleCalls.push({ lat, lng });

      if (mockState.googleDelayMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, mockState.googleDelayMs);
        });
      }

      if (mockState.googleError) {
        throw mockState.googleError;
      }

      return mockState.googleResult;
    },
  },
});

mock.module("../../../config/index.js", {
  namedExports: {
    getEnvironment: () => ({
      geocode: {
        enabled: true,
        googleMapsApiKey: "test-geocode-key",
        cacheTtlDays: mockState.cacheTtlDays,
      },
    }),
  },
});

const { resolveReverseGeocodeAddress } = await import(
  "./resolve-reverse-geocode-address.service.js"
);

const bangkokCoords = { lat: 13.756331, lng: 100.501765 };
const nearbyBangkokCoords = { lat: 13.756329, lng: 100.501769 };
const bangkokCacheKey = buildGeocodeCacheKey(bangkokCoords);

assert.equal(
  buildGeocodeCacheKey(nearbyBangkokCoords),
  bangkokCacheKey,
  "nearby coordinates must share the same rounded cache key",
);

const resetMockState = () => {
  mockState.cacheByKey.clear();
  mockState.findCalls = [];
  mockState.upsertCalls = [];
  mockState.googleCalls = [];
  mockState.googleDelayMs = 0;
  mockState.googleError = null;
  mockState.googleResult = {
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
  };
  mockState.cacheTtlDays = 30;
};

const seedCachedRecord = ({
  cacheKey = bangkokCacheKey,
  lat = 13.75633,
  lng = 100.50177,
  formattedAddress = "Cached address",
  placeId = "cached-place",
  fetchedAt = FIXED_NOW,
} = {}) => {
  mockState.cacheByKey.set(cacheKey, {
    cacheKey,
    lat,
    lng,
    formattedAddress,
    placeId,
    fetchedAt,
    expiresAt: new Date("2026-09-01T05:00:00.000Z"),
  });
};

describe("resolveReverseGeocodeAddress", () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  describe("when a fresh cache entry already exists", () => {
    test("returns the cached address without calling Google", async () => {
      seedCachedRecord();

      const result = await resolveReverseGeocodeAddress(bangkokCoords);

      assert.deepEqual(result, {
        lat: 13.75633,
        lng: 100.50177,
        formattedAddress: "Cached address",
        placeId: "cached-place",
        source: GEOCODE_SOURCE.GOOGLE,
        cached: true,
        fetchedAt: FIXED_NOW.toISOString(),
      });
      assert.equal(mockState.googleCalls.length, 0);
      assert.equal(mockState.upsertCalls.length, 0);
      assert.equal(mockState.findCalls.length, 1);
      assert.equal(mockState.findCalls[0].cacheKey, bangkokCacheKey);
    });

    test("passes the session through to the cache lookup", async () => {
      seedCachedRecord();
      const session = { id: "session-1" };

      await resolveReverseGeocodeAddress({ ...bangkokCoords, session });

      assert.equal(mockState.findCalls[0].session, session);
    });
  });

  describe("when the cache misses", () => {
    test("fetches from Google, persists the result, and returns cached=false", async () => {
      const result = await resolveReverseGeocodeAddress(bangkokCoords);

      assert.equal(mockState.googleCalls.length, 1);
      assert.deepEqual(mockState.googleCalls[0], bangkokCoords);
      assert.equal(mockState.upsertCalls.length, 1);
      assert.equal(mockState.upsertCalls[0].cacheKey, bangkokCacheKey);
      assert.equal(mockState.upsertCalls[0].lat, 13.75633);
      assert.equal(mockState.upsertCalls[0].lng, 100.50177);
      assert.equal(
        mockState.upsertCalls[0].formattedAddress,
        "123 Sukhumvit Rd, Bangkok, Thailand",
      );
      assert.equal(mockState.upsertCalls[0].placeId, "place-123");
      assert.ok(mockState.upsertCalls[0].fetchedAt instanceof Date);
      assert.ok(mockState.upsertCalls[0].expiresAt instanceof Date);

      const expectedExpiry = new Date(mockState.upsertCalls[0].fetchedAt);
      expectedExpiry.setUTCDate(expectedExpiry.getUTCDate() + 30);
      assert.equal(
        mockState.upsertCalls[0].expiresAt.toISOString(),
        expectedExpiry.toISOString(),
      );

      assert.equal(result.cached, false);
      assert.equal(result.source, GEOCODE_SOURCE.GOOGLE);
      assert.equal(result.formattedAddress, mockState.googleResult.formattedAddress);
      assert.equal(result.placeId, mockState.googleResult.placeId);
      assert.equal(result.lat, 13.75633);
      assert.equal(result.lng, 100.50177);
      assert.match(result.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
    });

    test("passes the session through to the cache upsert", async () => {
      const session = { id: "session-2" };

      await resolveReverseGeocodeAddress({ ...bangkokCoords, session });

      assert.equal(mockState.upsertCalls[0].session, session);
    });

    test("propagates Google provider errors without writing to the cache", async () => {
      mockState.googleError = new AppError(
        "Reverse geocoding is temporarily unavailable",
        503,
        "GEOCODE_UNAVAILABLE",
      );

      await assert.rejects(
        () => resolveReverseGeocodeAddress(bangkokCoords),
        (error) => {
          assert.ok(error instanceof AppError);
          assert.equal(error.statusCode, 503);
          assert.equal(error.code, "GEOCODE_UNAVAILABLE");
          return true;
        },
      );

      assert.equal(mockState.googleCalls.length, 1);
      assert.equal(mockState.upsertCalls.length, 0);
      assert.equal(mockState.cacheByKey.size, 0);
    });
  });

  describe("when multiple requests share the same coordinates", () => {
    test("dedupes in-flight Google calls for the same rounded cache key", async () => {
      mockState.googleDelayMs = 25;

      const firstPromise = resolveReverseGeocodeAddress(bangkokCoords);
      const secondPromise = resolveReverseGeocodeAddress(nearbyBangkokCoords);

      const [firstResult, secondResult] = await Promise.all([
        firstPromise,
        secondPromise,
      ]);

      assert.equal(mockState.googleCalls.length, 1);
      assert.equal(mockState.upsertCalls.length, 1);
      assert.deepEqual(firstResult, secondResult);
      assert.equal(firstResult.cached, false);
    });

    test("serves subsequent requests from cache after the first request completes", async () => {
      const firstResult = await resolveReverseGeocodeAddress(bangkokCoords);
      const secondResult = await resolveReverseGeocodeAddress(nearbyBangkokCoords);

      assert.equal(mockState.googleCalls.length, 1);
      assert.equal(firstResult.cached, false);
      assert.equal(secondResult.cached, true);
      assert.equal(secondResult.formattedAddress, firstResult.formattedAddress);
    });

    test("allows a retry after a failed in-flight request is cleared", async () => {
      mockState.googleError = new AppError(
        "Reverse geocoding is temporarily unavailable",
        503,
        "GEOCODE_UNAVAILABLE",
      );

      await assert.rejects(() => resolveReverseGeocodeAddress(bangkokCoords));

      mockState.googleError = null;

      const result = await resolveReverseGeocodeAddress(bangkokCoords);

      assert.equal(mockState.googleCalls.length, 2);
      assert.equal(result.cached, false);
      assert.equal(result.formattedAddress, mockState.googleResult.formattedAddress);
    });
  });

  describe("when requests use different coordinates", () => {
    test("calls Google separately for each distinct cache key", async () => {
      await Promise.all([
        resolveReverseGeocodeAddress(bangkokCoords),
        resolveReverseGeocodeAddress({ lat: 13.7564, lng: 100.5019 }),
      ]);

      assert.equal(mockState.googleCalls.length, 2);
      assert.equal(mockState.upsertCalls.length, 2);
      assert.notEqual(
        mockState.upsertCalls[0].cacheKey,
        mockState.upsertCalls[1].cacheKey,
      );
    });
  });

  describe("when session validation fails", () => {
    test("rejects a non-object session", async () => {
      await assert.rejects(
        () =>
          resolveReverseGeocodeAddress({
            ...bangkokCoords,
            session: "invalid-session",
          }),
        (error) => {
          assert.ok(error instanceof AppError);
          assert.equal(error.statusCode, 422);
          assert.equal(error.code, "VALIDATION_ERROR");
          assert.match(error.message, /session must be an object/);
          return true;
        },
      );

      assert.equal(mockState.findCalls.length, 0);
      assert.equal(mockState.googleCalls.length, 0);
    });

    test("accepts a null session", async () => {
      await resolveReverseGeocodeAddress({ ...bangkokCoords, session: null });

      assert.equal(mockState.findCalls[0].session, null);
      assert.equal(mockState.googleCalls.length, 1);
    });
  });
});
