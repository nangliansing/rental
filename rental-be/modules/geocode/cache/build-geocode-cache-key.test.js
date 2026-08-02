import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  GEOCODE_CACHE_COORDINATE_DECIMALS,
  GEOCODE_CACHE_VERSION,
} from "../geocode.constants.js";
import { buildGeocodeCacheKey } from "./build-geocode-cache-key.js";

describe("buildGeocodeCacheKey", () => {
  describe("when building the default cache key", () => {
    test("returns rounded coordinates with the default cache version", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 13.7563312, lng: 100.5017654 }),
        `13.75633:100.50177:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("uses five decimal places for coordinate rounding", () => {
      assert.equal(GEOCODE_CACHE_COORDINATE_DECIMALS, 5);

      assert.equal(
        buildGeocodeCacheKey({ lat: 13.756331, lng: 100.501761 }),
        buildGeocodeCacheKey({ lat: 13.756329, lng: 100.501759 }),
      );
    });

    test("includes the cache version suffix", () => {
      assert.match(
        buildGeocodeCacheKey({ lat: 0, lng: 0 }),
        /:v1$/,
      );
    });
  });

  describe("when coordinates differ beyond rounding precision", () => {
    test("produces different keys for distinct rounded coordinates", () => {
      const firstKey = buildGeocodeCacheKey({ lat: 13.75633, lng: 100.50176 });
      const secondKey = buildGeocodeCacheKey({ lat: 13.75634, lng: 100.50176 });

      assert.notEqual(firstKey, secondKey);
    });

    test("produces different keys when only longitude changes", () => {
      const firstKey = buildGeocodeCacheKey({ lat: 13.75633, lng: 100.50176 });
      const secondKey = buildGeocodeCacheKey({ lat: 13.75633, lng: 100.50177 });

      assert.notEqual(firstKey, secondKey);
    });
  });

  describe("when coordinates are at geographic boundaries", () => {
    test("accepts the north pole", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 90, lng: 0 }),
        `90:0:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("accepts the south pole", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: -90, lng: 0 }),
        `-90:0:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("accepts the anti-meridian west boundary", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 0, lng: -180 }),
        `0:-180:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("accepts the anti-meridian east boundary", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 0, lng: 180 }),
        `0:180:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("accepts negative coordinates in both hemispheres", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: -33.86882, lng: -151.20929 }),
        `-33.86882:-151.20929:v${GEOCODE_CACHE_VERSION}`,
      );
    });
  });

  describe("when rounding edge cases occur", () => {
    test("rounds half-up at the fifth decimal place for latitude", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 13.756335, lng: 100.5018 }),
        `13.75634:100.5018:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("rounds half-up at the fifth decimal place for longitude", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 13.7563, lng: 100.5017655 }),
        `13.7563:100.50177:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("preserves trailing zeros in the rounded numeric representation", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: 1.2, lng: 3.4 }),
        `1.2:3.4:v${GEOCODE_CACHE_VERSION}`,
      );
    });
  });

  describe("when a custom cache version is provided", () => {
    test("embeds the custom version in the cache key", () => {
      assert.equal(
        buildGeocodeCacheKey({
          lat: 13.7563,
          lng: 100.5018,
          cacheVersion: 2,
        }),
        "13.7563:100.5018:v2",
      );
    });

    test("produces different keys for different cache versions at the same coordinates", () => {
      const versionOne = buildGeocodeCacheKey({
        lat: 13.7563,
        lng: 100.5018,
        cacheVersion: 1,
      });
      const versionTwo = buildGeocodeCacheKey({
        lat: 13.7563,
        lng: 100.5018,
        cacheVersion: 2,
      });

      assert.notEqual(versionOne, versionTwo);
    });
  });

  describe("when invalid numeric values are passed through", () => {
    test("propagates NaN coordinates into the key without throwing", () => {
      assert.equal(
        buildGeocodeCacheKey({ lat: Number.NaN, lng: 100.5018 }),
        `NaN:100.5018:v${GEOCODE_CACHE_VERSION}`,
      );
    });

    test("propagates infinite coordinates into the key without throwing", () => {
      assert.equal(
        buildGeocodeCacheKey({
          lat: Number.POSITIVE_INFINITY,
          lng: Number.NEGATIVE_INFINITY,
        }),
        `Infinity:-Infinity:v${GEOCODE_CACHE_VERSION}`,
      );
    });
  });
});
