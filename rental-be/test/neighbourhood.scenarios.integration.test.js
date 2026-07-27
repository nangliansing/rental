import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, afterEach, before, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import {
  DENSE_POI_CATEGORY_CAPS,
  MAX_BUS_STOPS_RETURNED,
  MAX_RETURNED_PLACES,
  MIN_RADIUS_METERS,
  NEIGHBOURHOOD_CATEGORIES,
} from "../modules/neighbourhood/neighbourhood.constants.js";
import { buildNeighbourhoodCacheKey } from "../modules/neighbourhood/cache/build-neighbourhood-cache-key.js";
import NeighbourhoodCache from "../modules/neighbourhood/cache/neighbourhood-cache.model.js";

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

let baseUrl;
let Building;
let httpServer;
let mongoServer;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, headers: response.headers, status: response.status };
};

const createBuilding = (overrides = {}) =>
  Building.create({
    name: "Scenario Test Building",
    location: { type: "Point", coordinates: [100.6051, 13.6963] },
    minRent: null,
    maxRent: null,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

const assertNeighbourhoodContract = (data, { radiusMeters, fetchRadiusMeters }) => {
  assert.equal(typeof data.buildingId, "string");
  assert.equal(typeof data.origin.lat, "number");
  assert.equal(typeof data.origin.lng, "number");
  assert.equal(data.radiusMeters, radiusMeters);
  assert.equal(data.fetchRadiusMeters, fetchRadiusMeters);
  assert.equal(data.source, "openstreetmap");
  assert.match(data.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(["hit", "miss", "stale", "bypass"].includes(data.cacheStatus));
  assert.equal(typeof data.summary, "object");
  assert.equal(data.summary.all, data.places.length);
  assert.ok(Array.isArray(data.categories));
  assert.ok(Array.isArray(data.places));

  for (const category of NEIGHBOURHOOD_CATEGORIES) {
    assert.equal(typeof data.summary[category.key], "number");
  }

  for (const category of data.categories) {
    assert.ok(category.count > 0);
    assert.equal(typeof category.label, "string");
    assert.equal(typeof category.priority, "number");
    if (category.truncated != null) {
      assert.equal(category.truncated, true);
    }
  }

  for (let index = 1; index < data.categories.length; index += 1) {
    assert.ok(
      data.categories[index].priority >= data.categories[index - 1].priority,
    );
  }

  for (const place of data.places) {
    assert.equal(typeof place.id, "string");
    assert.ok(place.id.length > 0);
    assert.equal(typeof place.name, "string");
    assert.equal(typeof place.category, "string");
    assert.ok(Number.isFinite(place.lat));
    assert.ok(Number.isFinite(place.lng));
    assert.ok(Number.isFinite(place.distanceMeters));
    assert.ok(place.distanceMeters <= radiusMeters);
  }

  for (let index = 1; index < data.places.length; index += 1) {
    const previous = data.places[index - 1];
    const current = data.places[index];
    const distanceDelta = previous.distanceMeters - current.distanceMeters;

    assert.ok(
      distanceDelta < 0 ||
        (distanceDelta === 0 && previous.name.localeCompare(current.name) <= 0),
    );
  }
};

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });

  process.env.MONGODB_URI = mongoServer.getUri("neighbourhood_scenarios_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();
  configureCloudinary(config.cloudinary);

  await mongoose.connect(config.mongodbUri, { autoIndex: false });

  const [appModule, buildingModelModule] = await Promise.all([
    import("../app.js"),
    import("../modules/building/building.model.js"),
  ]);

  Building = buildingModelModule.default;

  httpServer = createServer(appModule.createApp({ config }));
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;

  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

after(async () => {
  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("GET /api/v1/buildings/:buildingId/neighbourhood — validation scenarios", () => {
  test("rejects invalid building id", async () => {
    const response = await request("/api/v1/buildings/not-a-valid-id/neighbourhood");

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects missing building", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(`/api/v1/buildings/${missingId}/neighbourhood`);

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "BUILDING_NOT_FOUND");
  });

  test("rejects inactive building", async () => {
    const building = await createBuilding({ isActive: false });
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood`,
    );

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "BUILDING_NOT_FOUND");
  });

  test("rejects radiusM greater than fetchRadiusM", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=1000`,
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /radiusM must be less than or equal to fetchRadiusM/);
  });

  test("rejects radius below minimum", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=${MIN_RADIUS_METERS - 1}`,
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects radius above maximum", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=2001`,
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects fetchRadius above maximum", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?fetchRadiusM=2001`,
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects zero fetchRadius", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?fetchRadiusM=0`,
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects non-numeric query params", async () => {
    const building = await createBuilding();
    const [badRadius, badFetchRadius] = await Promise.all([
      request(
        `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=abc`,
      ),
      request(
        `/api/v1/buildings/${building._id.toString()}/neighbourhood?fetchRadiusM=abc`,
      ),
    ]);

    assert.equal(badRadius.status, 422);
    assert.equal(badFetchRadius.status, 422);
  });
});

describe("GET /api/v1/buildings/:buildingId/neighbourhood — success scenarios", () => {
  test("returns defaults when query params are omitted", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood`,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assertNeighbourhoodContract(response.body.data, {
      radiusMeters: 1000,
      fetchRadiusMeters: 2000,
    });
    assert.equal(response.body.data.cacheStatus, "bypass");
  });

  test("accepts string query params and boundary radii", async () => {
    const building = await createBuilding();
    const [minRadius, maxRadius] = await Promise.all([
      request(
        `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=500&fetchRadiusM=2000`,
      ),
      request(
        `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=2000&fetchRadiusM=2000`,
      ),
    ]);

    assert.equal(minRadius.status, 200);
    assert.equal(maxRadius.status, 200);
    assert.equal(minRadius.body.data.radiusMeters, 500);
    assert.equal(maxRadius.body.data.radiusMeters, 2000);
  });

  test("works without authentication", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
      { headers: {} },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  test("returns empty neighbourhood for remote buildings", async () => {
    const building = await createBuilding({
      location: { type: "Point", coordinates: [0, 0] },
    });
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=500&fetchRadiusM=500`,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.summary.all, 0);
    assert.deepEqual(response.body.data.categories, []);
    assert.deepEqual(response.body.data.places, []);
  });

  test("hides zero-count categories from tabs", async () => {
    const building = await createBuilding();
    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.ok(
      response.body.data.categories.every((category) => category.count > 0),
    );
  });
});

describe("GET /api/v1/buildings/:buildingId/neighbourhood — cache scenarios", () => {
  test("reuses cache on second request with smaller radiusM", async () => {
    const building = await createBuilding();
    const path = `/api/v1/buildings/${building._id.toString()}/neighbourhood`;

    const first = await request(`${path}?radiusM=1500&fetchRadiusM=2000`);
    const second = await request(`${path}?radiusM=1000&fetchRadiusM=2000`);

    assert.equal(first.body.data.cacheStatus, "bypass");
    assert.equal(second.body.data.cacheStatus, "hit");
    assert.ok(second.body.data.summary.all <= first.body.data.summary.all);
  });

  test("shares cache between buildings with the same rounded origin", async () => {
    const [buildingA, buildingB] = await Promise.all([
      createBuilding({
        location: { type: "Point", coordinates: [100.60511, 13.69631] },
      }),
      createBuilding({
        location: { type: "Point", coordinates: [100.60519, 13.69639] },
      }),
    ]);

    const first = await request(
      `/api/v1/buildings/${buildingA._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
    );
    const second = await request(
      `/api/v1/buildings/${buildingB._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
    );

    assert.equal(first.body.data.cacheStatus, "bypass");
    assert.equal(second.body.data.cacheStatus, "hit");
    assert.equal(
      buildNeighbourhoodCacheKey({
        origin: first.body.data.origin,
        fetchRadiusMeters: 2000,
      }),
      buildNeighbourhoodCacheKey({
        origin: second.body.data.origin,
        fetchRadiusMeters: 2000,
      }),
    );
  });

  test("returns cache hit when seeded cache contains OSM places", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };

    await NeighbourhoodCache.create({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
      origin,
      fetchRadiusMeters: 2000,
      places: [
        {
          id: "osm-node-cafe",
          name: "Scenario Cafe",
          lat: 13.6964,
          lng: 100.6052,
          category: "cafe",
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.cacheStatus, "hit");
    assert.ok(response.body.data.summary.cafe > 0);
    assert.ok(response.body.data.summary.public_transport > 0);
  });
});

describe("GET /api/v1/buildings/:buildingId/neighbourhood — truncation and defensive scenarios", () => {
  test("caps dense convenience POIs and exposes truncation metadata", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };
    const conveniencePlaces = Array.from({ length: 30 }, (_, index) => ({
      id: `conv-${index}`,
      name: `Store ${index}`,
      lat: 13.6963 + index * 0.00005,
      lng: 100.6051,
      category: "convenience",
    }));

    await NeighbourhoodCache.create({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
      origin,
      fetchRadiusMeters: 2000,
      places: conveniencePlaces,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=2000&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.body.data.summary.convenience,
      DENSE_POI_CATEGORY_CAPS.convenience,
    );
    assert.equal(response.body.data.summary.truncated, true);
    assert.ok(response.body.data.summary.totalWithinRadius > response.body.data.summary.all);
    assert.ok(
      response.body.data.categories.some(
        (category) => category.key === "convenience" && category.truncated === true,
      ),
    );
  });

  test("caps bus stops and marks public transport truncated", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };
    const busStops = Array.from(
      { length: MAX_BUS_STOPS_RETURNED + 10 },
      (_, index) => ({
        id: `bus-${index}`,
        name: `Bus stop ${index}`,
        lat: 13.6963 + index * 0.0006,
        lng: 100.6051,
        category: "public_transport",
        mode: "bus",
        transitRole: "bus_stop",
      }),
    );

    await NeighbourhoodCache.create({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
      origin,
      fetchRadiusMeters: 2000,
      places: [
        ...busStops,
        {
          id: "bts-nearby",
          name: "BTS Nearby",
          lat: 13.6963,
          lng: 100.6051,
          category: "public_transport",
          mode: "bts",
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=2000&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.body.data.places.filter((place) => place.transitRole === "bus_stop")
        .length,
      MAX_BUS_STOPS_RETURNED,
    );
    assert.ok(response.body.data.places.some((place) => place.id === "bts-nearby"));
    assert.ok(
      response.body.data.categories.some(
        (category) =>
          category.key === "public_transport" && category.truncated === true,
      ),
    );
  });

  test("applies global non-transit backstop after category caps", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };
    const supermarketPlaces = Array.from(
      { length: MAX_RETURNED_PLACES + 20 },
      (_, index) => ({
        id: `market-${index}`,
        name: `Supermarket ${index}`,
        lat: 13.6963 + index * 0.00001,
        lng: 100.6051,
        category: "supermarket",
      }),
    );

    await NeighbourhoodCache.create({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
      origin,
      fetchRadiusMeters: 2000,
      places: supermarketPlaces,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=2000&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.body.data.places.filter(
        (place) => place.category !== "public_transport",
      ).length,
      MAX_RETURNED_PLACES,
    );
    assert.equal(response.body.data.summary.truncated, true);
  });

  test("ignores invalid cached places without failing the request", async () => {
    const building = await createBuilding();
    const origin = { lat: 13.6963, lng: 100.6051 };

    await NeighbourhoodCache.collection.insertOne({
      cacheKey: buildNeighbourhoodCacheKey({
        origin,
        fetchRadiusMeters: 2000,
      }),
      origin,
      fetchRadiusMeters: 2000,
      places: [
        {
          id: "valid-pharmacy",
          name: "Valid Pharmacy",
          lat: 13.6964,
          lng: 100.6052,
          category: "pharmacy",
        },
        {
          id: "",
          name: "Bad id",
          lat: 13.6964,
          lng: 100.6052,
          category: "pharmacy",
        },
        {
          id: "bad-coords",
          name: "Bad Coords",
          lat: Number.NaN,
          lng: 100.6052,
          category: "pharmacy",
        },
        {
          id: "unknown-category",
          name: "Bank",
          lat: 13.6964,
          lng: 100.6052,
          category: "bank",
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(
      `/api/v1/buildings/${building._id.toString()}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
    );

    assert.equal(response.status, 200);
    assert.ok(
      response.body.data.places.some((place) => place.id === "valid-pharmacy"),
    );
    assert.ok(
      response.body.data.places.every((place) => place.id !== "bad-coords"),
    );
  });
});
