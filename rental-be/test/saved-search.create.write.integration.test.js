import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  after,
  afterEach,
  before,
  describe,
  test,
} from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import {
  SAVED_SEARCH_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/saved-search/saved-search.constants.js";
import { USER_ROLES, USER_STATUSES } from "../modules/user/user.constants.js";

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
process.env.RATE_LIMIT_AUTH_MAX = "1000";
process.env.RATE_LIMIT_MUTATION_MAX = "1000";

let SavedSearch;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const createPath = "/api/v1/saved-searches";

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const validPosition = { lat: 13.73, lng: 100.54 };

const validLineGeometry = {
  type: "LineString",
  coordinates: [
    [100.6, 13.7],
    [100.7, 13.8],
  ],
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

const assertRequestId = (response) => {
  assert.equal(typeof response.body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), response.body.requestId);
};

const createUser = async ({
  role = USER_ROLES.USER,
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: `Saved search ${role} ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const createSavedSearch = async ({ token, body, headers = {} }) => {
  return request(createPath, {
    method: "POST",
    headers: {
      ...bearerHeaders(token),
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const areaBody = (overrides = {}) => ({
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
    isForeignerAccepted: true,
  },
  ...overrides,
});

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

  process.env.MONGODB_URI = replSet.getUri("saved_search_create_write_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, savedSearchModule, userModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/saved-search/saved-search.model.js"),
      import("../modules/user/user.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  SavedSearch = savedSearchModule.default;
  User = userModule.default;

  httpServer = createServer(appModule.createApp({ config }));
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(async () => {
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
  await replSet?.stop();
});

describe("POST /api/v1/saved-searches", () => {
  test("creates an area saved search for an authenticated active user", async () => {
    const { token, user } = await createUser();
    const agentProfileId = new mongoose.Types.ObjectId().toString();

    const response = await createSavedSearch({
      token,
      body: areaBody({
        name: "  Client condo request  ",
        filters: {
          minRent: 15_000,
          maxRent: 35_000,
          bedroomCount: 2,
          buildingType: "Condo",
          isForeignerAccepted: true,
          agentProfileIds: [agentProfileId],
        },
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);

    const data = response.body.data;
    assert.equal(typeof data._id, "string");
    assert.equal(data.createdBy, user._id.toString());
    assert.equal(data.name, "Client condo request");
    assert.equal(data.description, "Near BTS");
    assert.equal(data.status, SAVED_SEARCH_STATUSES.WAITING);
    assert.equal(data.isDeleted, false);
    assert.equal(data.deletedAt, null);
    assert.equal(data.geoSearch.mode, GEO_SEARCH_MODES.AREA);
    assert.deepEqual(data.geoSearch.bounds, validBounds);
    assert.equal(data.geoSearch.placeName, "Phrom Phong");
    assert.equal(data.filters.minRent, 15_000);
    assert.equal(data.filters.maxRent, 35_000);
    assert.equal(data.filters.bedroomCount, 2);
    assert.equal(data.filters.buildingType, "Condo");
    assert.equal(data.filters.isForeignerAccepted, true);
    assert.deepEqual(data.filters.agentProfileIds, [agentProfileId]);
    assert.equal(typeof data.createdAt, "string");
    assert.equal(typeof data.updatedAt, "string");

    const saved = await SavedSearch.findById(data._id).lean();
    assert.ok(saved);
    assert.equal(saved.createdBy.toString(), user._id.toString());
    assert.equal(saved.name, "Client condo request");
    assert.equal(saved.status, SAVED_SEARCH_STATUSES.WAITING);
    assert.equal(saved.isDeleted, false);
    assert.equal(saved.filters.agentProfileIds[0].toString(), agentProfileId);
    assert.equal(await SavedSearch.countDocuments(), 1);
  });

  test("creates nearby and line saved searches", async () => {
    const { token, user } = await createUser();

    const nearbyResponse = await createSavedSearch({
      token,
      body: {
        name: "Pin search",
        geoSearch: {
          mode: GEO_SEARCH_MODES.NEARBY,
          position: validPosition,
          radiusMeters: 500,
        },
      },
    });

    assert.equal(nearbyResponse.status, 201);
    assert.equal(nearbyResponse.body.data.geoSearch.mode, GEO_SEARCH_MODES.NEARBY);
    assert.deepEqual(
      nearbyResponse.body.data.geoSearch.position,
      validPosition,
    );
    assert.equal(nearbyResponse.body.data.geoSearch.radiusMeters, 500);
    assert.equal(nearbyResponse.body.data.status, SAVED_SEARCH_STATUSES.WAITING);
    // Mongoose initializes empty array filter fields on save.
    assert.equal(nearbyResponse.body.data.filters.minRent, undefined);
    assert.equal(nearbyResponse.body.data.filters.maxRent, undefined);
    assert.deepEqual(nearbyResponse.body.data.filters.agentProfileIds, []);

    const lineResponse = await createSavedSearch({
      token,
      body: {
        name: "Line search",
        geoSearch: {
          mode: GEO_SEARCH_MODES.LINE,
          geometry: validLineGeometry,
          distanceMeters: 750,
        },
        filters: {},
      },
    });

    assert.equal(lineResponse.status, 201);
    assert.equal(lineResponse.body.data.geoSearch.mode, GEO_SEARCH_MODES.LINE);
    assert.deepEqual(
      lineResponse.body.data.geoSearch.geometry,
      validLineGeometry,
    );
    assert.equal(lineResponse.body.data.geoSearch.distanceMeters, 750);

    const savedCount = await SavedSearch.countDocuments({
      createdBy: user._id,
    });
    assert.equal(savedCount, 2);
  });

  test("ignores client-provided status and always creates Waiting", async () => {
    const { token } = await createUser();

    const response = await createSavedSearch({
      token,
      body: areaBody({
        status: SAVED_SEARCH_STATUSES.CLOSED,
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, SAVED_SEARCH_STATUSES.WAITING);

    const saved = await SavedSearch.findById(response.body.data._id).lean();
    assert.equal(saved.status, SAVED_SEARCH_STATUSES.WAITING);
  });

  test("allows multiple saved searches for the same user", async () => {
    const { token, user } = await createUser();

    const first = await createSavedSearch({
      token,
      body: areaBody({ name: "First request" }),
    });
    const second = await createSavedSearch({
      token,
      body: areaBody({ name: "Second request" }),
    });

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.body.data._id, second.body.data._id);
    assert.equal(await SavedSearch.countDocuments({ createdBy: user._id }), 2);
  });

  test("requires an access token", async () => {
    const response = await request(createPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(areaBody()),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
    assertRequestId(response);
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("rejects an invalid access token", async () => {
    const response = await createSavedSearch({
      token: "invalid-access-token",
      body: areaBody(),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  for (const [status, expectedCode] of [
    [USER_STATUSES.SUSPENDED, "ACCOUNT_SUSPENDED"],
    [USER_STATUSES.INACTIVE, "ACCOUNT_INACTIVE"],
  ]) {
    test(`rejects a ${status.toLowerCase()} user`, async () => {
      const { token } = await createUser({ status });

      const response = await createSavedSearch({
        token,
        body: areaBody(),
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.success, false);
      assert.equal(response.body.code, expectedCode);
      assertRequestId(response);
      assert.equal(await SavedSearch.countDocuments(), 0);
    });
  }

  test("rejects a token whose user no longer exists", async () => {
    const token = signAccessToken({
      _id: new mongoose.Types.ObjectId(),
      role: USER_ROLES.USER,
    });

    const response = await createSavedSearch({
      token,
      body: areaBody(),
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("returns 422 when geoSearch is missing", async () => {
    const { token } = await createUser();

    const response = await createSavedSearch({
      token,
      body: { name: "Missing geo" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "geoSearch is required");
    assertRequestId(response);
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("returns 422 for invalid geoSearch payloads", async () => {
    const { token } = await createUser();

    const missingBounds = await createSavedSearch({
      token,
      body: {
        name: "Area without bounds",
        geoSearch: { mode: GEO_SEARCH_MODES.AREA },
      },
    });
    assert.equal(missingBounds.status, 422);
    assert.equal(missingBounds.body.code, "VALIDATION_ERROR");

    const missingRadius = await createSavedSearch({
      token,
      body: {
        name: "Nearby without radius",
        geoSearch: {
          mode: GEO_SEARCH_MODES.NEARBY,
          position: validPosition,
        },
      },
    });
    assert.equal(missingRadius.status, 422);
    assert.equal(missingRadius.body.code, "VALIDATION_ERROR");

    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("returns 422 for invalid filters", async () => {
    const { token } = await createUser();

    const response = await createSavedSearch({
      token,
      body: areaBody({
        filters: {
          minRent: 5000,
          maxRent: 1000,
        },
      }),
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(
      response.body.message,
      "maxRent must be greater than or equal to minRent",
    );
    assertRequestId(response);
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("returns 422 for an empty name", async () => {
    const { token } = await createUser();

    const response = await createSavedSearch({
      token,
      body: areaBody({ name: "   " }),
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(await SavedSearch.countDocuments(), 0);
  });

  test("returns 400 for invalid JSON", async () => {
    const { token } = await createUser();

    const response = await request(createPath, {
      method: "POST",
      headers: bearerHeaders(token),
      body: "{not-json",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
    assertRequestId(response);
    assert.equal(await SavedSearch.countDocuments(), 0);
  });
});
