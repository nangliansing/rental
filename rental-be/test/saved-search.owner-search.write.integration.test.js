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
import { validateAvailableBy } from "../modules/listing/listing.validation.js";
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

const listPath = "/api/v1/saved-searches";

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, headers: response.headers, status: response.status };
};

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
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
    name: `Saved search list ${role} ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const seedSavedSearch = async ({
  user,
  name,
  status = SAVED_SEARCH_STATUSES.WAITING,
  availableBy = undefined,
  isDeleted = false,
  createdAt = undefined,
  bounds = validBounds,
}) => {
  const filters = {
    minRent: 15_000,
  };

  if (availableBy !== undefined) {
    filters.availableBy = availableBy;
  }

  const doc = await SavedSearch.create({
    createdBy: user._id,
    name,
    description: null,
    status,
    geoSearch: {
      mode: GEO_SEARCH_MODES.AREA,
      bounds,
      placeName: null,
    },
    filters,
    isDeleted,
    deletedAt: isDeleted ? new Date() : null,
  });

  if (createdAt) {
    await SavedSearch.updateOne(
      { _id: doc._id },
      { $set: { createdAt, updatedAt: createdAt } },
    );
  }

  return SavedSearch.findById(doc._id);
};

const listSavedSearches = async ({ token, query = "" }) => {
  const suffix = query ? `?${query}` : "";
  return request(`${listPath}${suffix}`, {
    method: "GET",
    headers: bearerHeaders(token),
  });
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

  process.env.MONGODB_URI = replSet.getUri(
    "saved_search_owner_search_write_test",
  );

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

describe("POST /api/v1/admin/saved-searches/overlaps", () => {
  const overlapBody = {
    geoSearch: {
      mode: GEO_SEARCH_MODES.AREA,
      bounds: validBounds,
    },
  };

  test("returns only active, non-deleted searches whose coverage overlaps", async () => {
    const admin = await createUser({ role: USER_ROLES.OWNER });
    const searchOwner = await createUser();
    await seedSavedSearch({ user: searchOwner.user, name: "Overlapping" });
    await seedSavedSearch({
      user: searchOwner.user,
      name: "Closed",
      status: SAVED_SEARCH_STATUSES.CLOSED,
    });
    await seedSavedSearch({
      user: searchOwner.user,
      name: "Deleted",
      isDeleted: true,
    });
    await seedSavedSearch({
      user: searchOwner.user,
      name: "Far away",
      bounds: {
        northEast: { lat: 14.8, lng: 101.8 },
        southWest: { lat: 14.7, lng: 101.7 },
      },
    });

    const response = await request(
      "/api/v1/admin/saved-searches/overlaps",
      {
        method: "POST",
        headers: {
          ...bearerHeaders(admin.token),
          "content-type": "application/json",
        },
        body: JSON.stringify(overlapBody),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.map(({ name }) => name), [
      "Overlapping",
    ]);
    assert.equal(response.body.data[0].geoSearch.coverage, undefined);
    assert.deepEqual(response.body.pagination, {
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  test("does not expose cross-user overlap search to ordinary users", async () => {
    const { token } = await createUser();
    const response = await request(
      "/api/v1/admin/saved-searches/overlaps",
      {
        method: "POST",
        headers: {
          ...bearerHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify(overlapBody),
      },
    );

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "FORBIDDEN");
  });
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

describe("GET /api/v1/saved-searches", () => {
  test("keeps the deprecated client-requests route compatible", async () => {
    const { token, user } = await createUser();
    await seedSavedSearch({ user, name: "Legacy route result" });

    const response = await request("/api/v1/client-requests", {
      method: "GET",
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("deprecation"), "true");
    assert.equal(
      response.headers.get("sunset"),
      "Thu, 31 Dec 2026 23:59:59 GMT",
    );
    assert.equal(
      response.headers.get("link"),
      '</api/v1/saved-searches>; rel="successor-version"',
    );
    assert.equal(response.body.data[0].name, "Legacy route result");
  });

  test("lists only the caller's non-deleted requests", async () => {
    const owner = await createUser();
    const other = await createUser();

    await seedSavedSearch({ user: owner.user, name: "Mine" });
    await seedSavedSearch({
      user: owner.user,
      name: "Deleted mine",
      isDeleted: true,
    });
    await seedSavedSearch({ user: other.user, name: "Theirs" });

    const response = await listSavedSearches({ token: owner.token });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].name, "Mine");
    assert.equal(response.body.data[0].createdBy, owner.user._id.toString());
    assert.equal(response.body.data[0].geoSearch.coverage, undefined);
    assert.deepEqual(response.body.pagination, {
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  test("sorts sooner availableBy first and missing availableBy last", async () => {
    const { token, user } = await createUser();
    const sooner = validateAvailableBy("2026-09-01");
    const later = validateAvailableBy("2026-10-01");

    await seedSavedSearch({
      user,
      name: "No date older",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await seedSavedSearch({
      user,
      name: "Later date",
      availableBy: later,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    await seedSavedSearch({
      user,
      name: "Sooner date",
      availableBy: sooner,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    await seedSavedSearch({
      user,
      name: "No date newer",
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });

    const response = await listSavedSearches({ token });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((item) => item.name),
      ["Sooner date", "Later date", "No date newer", "No date older"],
    );
  });

  test("defaults omitted status to Waiting and can filter Closed", async () => {
    const { token, user } = await createUser();

    await seedSavedSearch({
      user,
      name: "Waiting request",
      status: SAVED_SEARCH_STATUSES.WAITING,
    });
    await seedSavedSearch({
      user,
      name: "Closed request",
      status: SAVED_SEARCH_STATUSES.CLOSED,
    });

    const defaultsToWaiting = await listSavedSearches({ token });
    assert.equal(defaultsToWaiting.status, 200);
    assert.equal(defaultsToWaiting.body.data.length, 1);
    assert.equal(defaultsToWaiting.body.data[0].name, "Waiting request");
    assert.equal(defaultsToWaiting.body.pagination.total, 1);

    const waiting = await listSavedSearches({
      token,
      query: "status=Waiting",
    });
    assert.equal(waiting.status, 200);
    assert.equal(waiting.body.data.length, 1);
    assert.equal(waiting.body.data[0].name, "Waiting request");

    const closed = await listSavedSearches({
      token,
      query: "status=Closed",
    });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data.length, 1);
    assert.equal(closed.body.data[0].name, "Closed request");
  });

  test("supports pagination", async () => {
    const { token, user } = await createUser();

    for (let index = 0; index < 3; index += 1) {
      await seedSavedSearch({
        user,
        name: `Request ${index}`,
        availableBy: validateAvailableBy(`2026-09-0${index + 1}`),
      });
    }

    const page1 = await listSavedSearches({
      token,
      query: "page=1&limit=2",
    });
    assert.equal(page1.status, 200);
    assert.equal(page1.body.data.length, 2);
    assert.deepEqual(page1.body.pagination, {
      page: 1,
      limit: 2,
      total: 3,
    });

    const page2 = await listSavedSearches({
      token,
      query: "page=2&limit=2",
    });
    assert.equal(page2.status, 200);
    assert.equal(page2.body.data.length, 1);
    assert.deepEqual(page2.body.pagination, {
      page: 2,
      limit: 2,
      total: 3,
    });
    assert.notEqual(page1.body.data[0]._id, page2.body.data[0]._id);
  });

  test("returns an empty page when the owner has no requests", async () => {
    const { token } = await createUser();

    const response = await listSavedSearches({ token });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
    assert.deepEqual(response.body.pagination, {
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  test("requires an access token", async () => {
    const response = await request(listPath, { method: "GET" });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
    assertRequestId(response);
  });

  for (const [status, expectedCode] of [
    [USER_STATUSES.SUSPENDED, "ACCOUNT_SUSPENDED"],
    [USER_STATUSES.INACTIVE, "ACCOUNT_INACTIVE"],
  ]) {
    test(`rejects a ${status.toLowerCase()} user`, async () => {
      const { token, user } = await createUser();
      await seedSavedSearch({ user, name: "Mine" });
      await User.updateOne({ _id: user._id }, { $set: { status } });

      const response = await listSavedSearches({ token });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
      assertRequestId(response);
    });
  }

  test("returns 422 for an invalid status", async () => {
    const { token } = await createUser();

    const response = await listSavedSearches({
      token,
      query: "status=Open",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "Invalid status: Open");
    assertRequestId(response);
  });
});
