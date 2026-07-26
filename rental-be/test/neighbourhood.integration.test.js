import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import { AppError } from "../shared/errors/app-error.js";
import Building from "../modules/building/building.model.js";
import { buildNeighbourhoodCacheKey } from "../modules/neighbourhood/cache/build-neighbourhood-cache-key.js";
import NeighbourhoodCache from "../modules/neighbourhood/cache/neighbourhood-cache.model.js";
import {
  getBuildingNeighbourhoodService,
  resolveNeighbourhoodPlaces,
} from "../modules/neighbourhood/services/index.js";

process.env.NODE_ENV = "test";
process.env.NEIGHBOURHOOD_OVERPASS_ENABLED = "false";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-with-at-least-32-characters";
process.env.GOOGLE_CLIENT_IDS =
  "1060222059887-test.apps.googleusercontent.com";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });

  process.env.MONGODB_URI = mongoServer.getUri("neighbourhood_test");

  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
  });

  const { initializeEnvironment } = await import("../config/index.js");
  initializeEnvironment();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Promise.all([
    Building.createIndexes(),
    NeighbourhoodCache.createIndexes(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

const createBuilding = (overrides = {}) =>
  Building.create({
    name: "Neighbourhood Test Building",
    location: { type: "Point", coordinates: [100.6051, 13.6963] },
    minRent: null,
    maxRent: null,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

describe("getBuildingNeighbourhoodService", () => {
  test("returns nearby public transport and excludes zero-count categories", async () => {
    const building = await createBuilding();
    const result = await getBuildingNeighbourhoodService({
      buildingIdInput: building._id.toString(),
      queryInput: { radiusM: 1500, fetchRadiusM: 2000 },
    });

    assert.equal(result.buildingId, building._id.toString());
    assert.equal(result.radiusMeters, 1500);
    assert.equal(result.fetchRadiusMeters, 2000);
    assert.equal(result.source, "openstreetmap");
    assert.match(result.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(result.summary.all > 0);
    assert.ok(result.summary.public_transport > 0);
    assert.ok(result.categories.every((category) => category.count > 0));
    assert.ok(
      result.categories.every(
        (left, index, categories) =>
          index === 0 || left.priority >= categories[index - 1].priority,
      ),
    );
    assert.ok(
      result.places.every(
        (place) =>
          place.distanceMeters <= 1500 &&
          Number.isFinite(place.lat) &&
          Number.isFinite(place.lng) &&
          typeof place.name === "string" &&
          typeof place.category === "string",
      ),
    );
  });

  test("uses default radius values when query params are omitted", async () => {
    const building = await createBuilding();
    const result = await getBuildingNeighbourhoodService({
      buildingIdInput: building._id.toString(),
      queryInput: {},
    });

    assert.equal(result.radiusMeters, 1000);
    assert.equal(result.fetchRadiusMeters, 2000);
  });

  test("reuses cached places for the same rounded origin and fetch radius", async () => {
    const building = await createBuilding();
    const buildingId = building._id.toString();

    const firstResult = await getBuildingNeighbourhoodService({
      buildingIdInput: buildingId,
      queryInput: { radiusM: 1500, fetchRadiusM: 2000 },
    });
    const secondResult = await getBuildingNeighbourhoodService({
      buildingIdInput: buildingId,
      queryInput: { radiusM: 1000, fetchRadiusM: 2000 },
    });

    assert.equal(firstResult.cacheStatus, "bypass");
    assert.equal(secondResult.cacheStatus, "hit");
    assert.ok(secondResult.summary.all <= firstResult.summary.all);
    assert.ok(
      secondResult.places.every((place) => place.distanceMeters <= 1000),
    );
  });

  test("shares cache entries between nearby buildings with rounded coordinates", async () => {
    const [buildingA, buildingB] = await Promise.all([
      createBuilding({
        name: "Building A",
        location: {
          type: "Point",
          coordinates: [100.60511, 13.69631],
        },
      }),
      createBuilding({
        name: "Building B",
        location: {
          type: "Point",
          coordinates: [100.60519, 13.69639],
        },
      }),
    ]);

    const firstResult = await getBuildingNeighbourhoodService({
      buildingIdInput: buildingA._id.toString(),
      queryInput: { radiusM: 1500, fetchRadiusM: 2000 },
    });
    const secondResult = await getBuildingNeighbourhoodService({
      buildingIdInput: buildingB._id.toString(),
      queryInput: { radiusM: 1500, fetchRadiusM: 2000 },
    });

    assert.equal(firstResult.cacheStatus, "bypass");
    assert.equal(secondResult.cacheStatus, "hit");
    assert.equal(
      buildNeighbourhoodCacheKey({
        origin: firstResult.origin,
        fetchRadiusMeters: 2000,
      }),
      buildNeighbourhoodCacheKey({
        origin: secondResult.origin,
        fetchRadiusMeters: 2000,
      }),
    );
  });

  test("returns an empty neighbourhood when nothing is within radius", async () => {
    const building = await createBuilding({
      location: { type: "Point", coordinates: [0, 0] },
    });

    const result = await getBuildingNeighbourhoodService({
      buildingIdInput: building._id.toString(),
      queryInput: { radiusM: 500, fetchRadiusM: 500 },
    });

    assert.equal(result.summary.all, 0);
    assert.deepEqual(result.categories, []);
    assert.deepEqual(result.places, []);
  });

  test("throws when the building does not exist", async () => {
    await assert.rejects(
      () =>
        getBuildingNeighbourhoodService({
          buildingIdInput: new mongoose.Types.ObjectId().toString(),
          queryInput: {},
        }),
      (error) => error.code === "BUILDING_NOT_FOUND",
    );
  });

  test("throws when the building is inactive", async () => {
    const building = await createBuilding({ isActive: false });

    await assert.rejects(
      () =>
        getBuildingNeighbourhoodService({
          buildingIdInput: building._id.toString(),
          queryInput: {},
        }),
      (error) => error.code === "BUILDING_NOT_FOUND",
    );
  });

  test("merges cached OSM places with static transit and filters by category counts", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };
    const cacheKey = buildNeighbourhoodCacheKey({
      origin,
      fetchRadiusMeters: 2000,
    });

    await NeighbourhoodCache.create({
      cacheKey,
      origin,
      fetchRadiusMeters: 2000,
      places: [
        {
          id: "osm-node-1",
          name: "Test Cafe",
          lat: 13.6964,
          lng: 100.6052,
          category: "cafe",
        },
        {
          id: "osm-node-2",
          name: "Test Pharmacy",
          lat: 13.6965,
          lng: 100.6053,
          category: "pharmacy",
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const result = await getBuildingNeighbourhoodService({
      buildingIdInput: building._id.toString(),
      queryInput: { radiusM: 1500, fetchRadiusM: 2000 },
    });

    assert.equal(result.cacheStatus, "hit");
    assert.ok(result.summary.public_transport > 0);
    assert.ok(result.summary.cafe > 0);
    assert.ok(result.summary.pharmacy > 0);
    assert.ok(result.categories.some((category) => category.key === "cafe"));
    assert.ok(
      result.categories.every(
        (category) => !["gym", "hospital", "market"].includes(category.key),
      ),
    );
  });
});

describe("resolveNeighbourhoodPlaces", () => {
  test("returns stale cache data when Overpass is unavailable", async () => {
    const origin = { lat: 13.6963, lng: 100.6051 };
    const cacheKey = buildNeighbourhoodCacheKey({
      origin,
      fetchRadiusMeters: 2000,
    });

    await NeighbourhoodCache.create({
      cacheKey,
      origin,
      fetchRadiusMeters: 2000,
      places: [
        {
          id: "cached-convenience",
          name: "Cached 7-Eleven",
          lat: 13.6964,
          lng: 100.6052,
          category: "convenience",
        },
      ],
      fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const result = await resolveNeighbourhoodPlaces({
      origin,
      fetchRadiusMeters: 2000,
      overpassEnabled: true,
      queryOverpassFn: async () => {
        throw new AppError(
          "Unable to fetch nearby places",
          503,
          "NEIGHBOURHOOD_UNAVAILABLE",
        );
      },
    });

    assert.equal(result.cacheStatus, "stale");
    assert.ok(result.places.some((place) => place.id === "cached-convenience"));
  });

  test("stores OSM places from Overpass on cache miss", async () => {
    const origin = { lat: 13.6963, lng: 100.6051 };

    const result = await resolveNeighbourhoodPlaces({
      origin,
      fetchRadiusMeters: 2000,
      overpassEnabled: true,
      queryOverpassFn: async () => [
        {
          id: "osm-node-99",
          name: "Mock Restaurant",
          lat: 13.6964,
          lng: 100.6052,
          category: "restaurant",
        },
      ],
    });

    assert.equal(result.cacheStatus, "miss");
    assert.ok(result.places.some((place) => place.id === "osm-node-99"));
    assert.ok(result.places.some((place) => place.category === "public_transport"));

    const cached = await NeighbourhoodCache.findOne({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
    }).lean();

    assert.ok(cached);
    assert.ok(cached.places.some((place) => place.id === "osm-node-99"));
  });

  test("deduplicates places with the same id when merging sources", async () => {
    const origin = { lat: 13.6963, lng: 100.6051 };

    const result = await resolveNeighbourhoodPlaces({
      origin,
      fetchRadiusMeters: 2000,
      overpassEnabled: true,
      queryOverpassFn: async () => [
        {
          id: "bts-bang-chak",
          name: "Duplicate Station",
          lat: 13.6963,
          lng: 100.6051,
          category: "public_transport",
        },
      ],
    });

    assert.equal(
      result.places.filter((place) => place.id === "bts-bang-chak").length,
      1,
    );
  });

  test("falls back to static transit when Overpass fails and no stale cache exists", async () => {
    const result = await resolveNeighbourhoodPlaces({
      origin: { lat: 13.6963, lng: 100.6051 },
      fetchRadiusMeters: 2000,
      overpassEnabled: true,
      queryOverpassFn: async () => {
        throw new AppError(
          "Unable to fetch nearby places",
          503,
          "NEIGHBOURHOOD_UNAVAILABLE",
        );
      },
    });

    assert.equal(result.cacheStatus, "miss");
    assert.ok(
      result.places.some((place) => place.category === "public_transport"),
    );
    assert.ok(result.places.every((place) => place.category === "public_transport"));
  });
});
