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
import { BUILDING_TYPES } from "../modules/building/building.constants.js";
import {
  KITCHEN_TYPES,
  LISTING_VISIBILITIES,
} from "../modules/listing/listing.constants.js";
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
let AgentProfile;
let User;
let Building;
let Listing;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const listPath = "/api/v1/saved-searches";
const demandOpportunitiesPath = "/api/v1/agent-demand-opportunities/search";

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

const createAgent = async (options = {}) => {
  const actor = await createUser(options);
  const agentProfile = await AgentProfile.create({
    userId: actor.user._id,
    displayName: "Demand Opportunity Agent",
    supportLanguages: ["English"],
  });
  return { ...actor, agentProfile };
};

const seedSavedSearch = async ({
  user,
  name,
  status = SAVED_SEARCH_STATUSES.WAITING,
  availableBy = undefined,
  isDeleted = false,
  createdAt = undefined,
  bounds = validBounds,
  filters: filterOverrides = {},
}) => {
  const filters = {
    minRent: 15_000,
    ...filterOverrides,
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

  const [
    appModule,
    authModule,
    savedSearchModule,
    userModule,
    agentModule,
    buildingModule,
    listingModule,
  ] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/saved-search/saved-search.model.js"),
      import("../modules/user/user.model.js"),
      import("../modules/agent/agent-profile.model.js"),
      import("../modules/building/building.model.js"),
      import("../modules/listing/listing.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  SavedSearch = savedSearchModule.default;
  User = userModule.default;
  AgentProfile = agentModule.default;
  Building = buildingModule.default;
  Listing = listingModule.default;

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

describe("SavedSearch confirmation timestamps", () => {
  test("insertMany assigns lastConfirmedAt to the exact createdAt value", async () => {
    const owner = await createUser();
    const [savedSearch] = await SavedSearch.insertMany([
      {
        createdBy: owner.user._id,
        name: "Bulk-created saved search",
        geoSearch: {
          mode: GEO_SEARCH_MODES.AREA,
          bounds: validBounds,
        },
        filters: {},
      },
    ]);

    assert.equal(
      savedSearch.lastConfirmedAt.getTime(),
      savedSearch.createdAt.getTime(),
    );
  });
});

describe("POST /api/v1/agent-demand-opportunities/search", () => {
  const searchBody = {
    area: {
      type: "Polygon",
      coordinates: [[
        [100.61, 13.74],
        [100.67, 13.74],
        [100.67, 13.79],
        [100.61, 13.79],
        [100.61, 13.74],
      ]],
    },
    pagination: { page: 1, limit: 20 },
  };

  const searchOpportunities = (token, body = searchBody) =>
    request(demandOpportunitiesPath, {
      method: "POST",
      headers: {
        ...(token ? bearerHeaders(token) : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

  test("returns only intersecting active non-deleted opportunities", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    const opportunity = await seedSavedSearch({
      user: owner.user,
      name: "Opportunity",
    });
    await SavedSearch.collection.updateOne(
      { _id: opportunity._id },
      { $set: { title: "Legacy title", description: "Private description" } },
    );
    await seedSavedSearch({
      user: owner.user,
      name: "Closed",
      status: SAVED_SEARCH_STATUSES.CLOSED,
    });
    await seedSavedSearch({
      user: owner.user,
      name: "Deleted",
      isDeleted: true,
    });
    await seedSavedSearch({
      user: owner.user,
      name: "Far away",
      bounds: {
        northEast: { lat: 14.8, lng: 101.8 },
        southWest: { lat: 14.7, lng: 101.7 },
      },
    });

    const response = await searchOpportunities(agent.token);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.map(({ name }) => name), ["Opportunity"]);
    assert.deepEqual(response.body.pagination, { page: 1, limit: 20, total: 1 });
    assert.equal(response.body.data[0].createdBy, undefined);
    assert.equal(response.body.data[0].isDeleted, undefined);
    assert.equal(response.body.data[0].title, undefined);
    assert.equal(response.body.data[0].description, undefined);
    assert.equal(response.body.data[0].geoSearch.coverage, undefined);
    assert.equal(
      response.body.data[0].lastConfirmedAt,
      response.body.data[0].createdAt,
    );
  });

  test("supports buffered point searches and pagination", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    await seedSavedSearch({ user: owner.user, name: "First" });
    await seedSavedSearch({ user: owner.user, name: "Second" });

    const response = await searchOpportunities(agent.token, {
      area: {
        type: "Point",
        coordinates: [100.64, 13.765],
        coverageMeters: 5_000,
      },
      pagination: { page: 2, limit: 1 },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assert.deepEqual(response.body.pagination, { page: 2, limit: 1, total: 2 });
  });

  test("supports every area geometry through the HTTP endpoint", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    await seedSavedSearch({ user: owner.user, name: "Geometry opportunity" });

    const areas = [
      {
        type: "LineString",
        coordinates: [[100.62, 13.75], [100.66, 13.78]],
        coverageMeters: 500,
      },
      {
        type: "MultiLineString",
        coordinates: [
          [[100.62, 13.75], [100.66, 13.78]],
          [[101, 14], [101.1, 14.1]],
        ],
        coverageMeters: 500,
      },
      {
        type: "MultiPolygon",
        coordinates: [
          [[
            [100.61, 13.74],
            [100.67, 13.74],
            [100.67, 13.79],
            [100.61, 13.79],
            [100.61, 13.74],
          ]],
        ],
      },
    ];

    for (const area of areas) {
      const response = await searchOpportunities(agent.token, {
        area,
        pagination: { page: 1, limit: 20 },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.data.map(({ name }) => name), [
        "Geometry opportunity",
      ]);
    }
  });

  test("classifies matching buildings once and prioritizes the caller's listing", async () => {
    const agent = await createAgent();
    const platformAgent = await createAgent();
    const owner = await createUser();
    const availableBy = new Date("2027-01-01T00:00:00.000Z");
    await seedSavedSearch({
      user: owner.user,
      name: "Filtered opportunity",
      filters: {
        maxRent: 30_000,
        contractMonths: 12,
        occupancy: 2,
        isForeignerAccepted: true,
        isTM30Provided: true,
        bedroomCount: 1,
        bathroomCount: 1,
        kitchenType: KITCHEN_TYPES.KITCHEN,
        isCookingAllowed: true,
        isPetAllowed: true,
        listingFacilities: ["Balcony"],
        availableBy,
        buildingType: BUILDING_TYPES.APARTMENT,
        buildingFacilities: ["Lift"],
        security: ["CCTV"],
        supportLanguages: ["English"],
        agentProfileIds: [
          agent.agentProfile._id,
          platformAgent.agentProfile._id,
        ],
      },
    });

    const createBuilding = (overrides = {}) =>
      Building.create({
        name: `Matching building ${new mongoose.Types.ObjectId()}`,
        buildingType: BUILDING_TYPES.APARTMENT,
        facilities: ["Lift"],
        security: ["CCTV"],
        location: { type: "Point", coordinates: [100.64, 13.765] },
        createdBy: owner.user._id,
        ...overrides,
      });
    const createListing = (buildingId, listedBy, overrides = {}) =>
      Listing.create({
        buildingId,
        listedBy,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 20_000,
        deposit: 20_000,
        moveInCost: 40_000,
        bedroomCount: 1,
        bathroomCount: 1,
        kitchenType: KITCHEN_TYPES.KITCHEN,
        contractMonths: 6,
        occupancy: 2,
        isCookingAllowed: true,
        isPetAllowed: true,
        facilities: ["Balcony"],
        availableAt: new Date("2026-12-01T00:00:00.000Z"),
        ...overrides,
      });

    const mineBuilding = await createBuilding();
    await createListing(mineBuilding._id, platformAgent.user._id);
    await createListing(mineBuilding._id, agent.user._id);

    const platformBuilding = await createBuilding();
    await createListing(platformBuilding._id, platformAgent.user._id);

    const inactiveBuilding = await createBuilding({ isActive: false });
    await createListing(inactiveBuilding._id, platformAgent.user._id);

    const mismatchedBuilding = await createBuilding({ facilities: [] });
    await createListing(mismatchedBuilding._id, platformAgent.user._id);

    const response = await searchOpportunities(agent.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].myMatchingBuildingCount, 1);
    assert.equal(response.body.data[0].platformMatchingBuildingCount, 1);
    assert.equal(response.body.data[0].matchingBuildingCountCapped, false);
    assert.equal(response.body.data[0].geoSearch.coverage, undefined);
  });

  test("caps matching-building work and reports that the count is truncated", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    await seedSavedSearch({ user: owner.user, name: "Capped opportunity" });

    const buildings = await Building.create(
      Array.from({ length: 21 }, (_, index) => ({
        name: `Capped matching building ${index}`,
        buildingType: BUILDING_TYPES.APARTMENT,
        location: { type: "Point", coordinates: [100.64, 13.765] },
        createdBy: owner.user._id,
      })),
    );
    await Listing.create(
      buildings.map((building) => ({
        buildingId: building._id,
        listedBy: agent.user._id,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 20_000,
        deposit: 20_000,
        moveInCost: 40_000,
        isCookingAllowed: true,
        isPetAllowed: false,
      })),
    );

    const response = await searchOpportunities(agent.token);

    assert.equal(response.status, 200);
    assert.equal(
      response.body.data[0].myMatchingBuildingCount,
      20,
      JSON.stringify(response.body.data[0]),
    );
    assert.equal(response.body.data[0].platformMatchingBuildingCount, 0);
    assert.equal(response.body.data[0].matchingBuildingCountCapped, true);
  });

  test("ranks unmatched opportunities first and applies matchStatus before pagination", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    await seedSavedSearch({ user: owner.user, name: "Matched opportunity" });
    await seedSavedSearch({
      user: owner.user,
      name: "Unmatched opportunity",
      filters: { minRent: 0, maxRent: 1_000 },
    });
    const building = await Building.create({
      name: "Ranking building",
      buildingType: BUILDING_TYPES.APARTMENT,
      location: { type: "Point", coordinates: [100.64, 13.765] },
      createdBy: owner.user._id,
    });
    await Listing.create({
      buildingId: building._id,
      listedBy: agent.user._id,
      visibility: LISTING_VISIBILITIES.PUBLIC,
      isForeignerAccepted: true,
      isTM30Provided: true,
      rent: 20_000,
      deposit: 20_000,
      moveInCost: 40_000,
      isCookingAllowed: true,
      isPetAllowed: false,
    });

    const all = await searchOpportunities(agent.token);
    assert.equal(all.status, 200);
    assert.deepEqual(all.body.data.map(({ name }) => name), [
      "Unmatched opportunity",
      "Matched opportunity",
    ]);
    assert.deepEqual(all.body.data[0].opportunityRanking, {
      score: 1,
      inventoryGapScore: 1,
      freshnessScore: 1,
      policyVersion: "v1",
    });
    assert.equal(all.body.data[1].opportunityRanking, null);

    const unmatched = await searchOpportunities(agent.token, {
      ...searchBody,
      matchStatus: "unmatched",
      pagination: { page: 1, limit: 1 },
    });
    assert.deepEqual(unmatched.body.data.map(({ name }) => name), [
      "Unmatched opportunity",
    ]);
    assert.deepEqual(unmatched.body.pagination, { page: 1, limit: 1, total: 1 });

    const matched = await searchOpportunities(agent.token, {
      ...searchBody,
      matchStatus: "matched",
      pagination: { page: 1, limit: 1 },
    });
    assert.deepEqual(matched.body.data.map(({ name }) => name), [
      "Matched opportunity",
    ]);
    assert.deepEqual(matched.body.pagination, { page: 1, limit: 1, total: 1 });
  });

  test("rejects ranking areas with more than the bounded candidate limit", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    await SavedSearch.create(
      Array.from({ length: 101 }, (_, index) => ({
        createdBy: owner.user._id,
        name: `Candidate ${index}`,
        geoSearch: {
          mode: GEO_SEARCH_MODES.AREA,
          bounds: validBounds,
        },
        filters: {},
      })),
    );

    const response = await searchOpportunities(agent.token);
    assert.equal(response.status, 422);
    assert.equal(response.body.code, "OPPORTUNITY_CANDIDATE_LIMIT_EXCEEDED");
  });

  test("requires authentication, an active account, and an agent profile", async () => {
    const unauthenticated = await searchOpportunities(null);
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.code, "ACCESS_TOKEN_REQUIRED");

    const invalidToken = await searchOpportunities("invalid-token");
    assert.equal(invalidToken.status, 401);
    assert.equal(invalidToken.body.code, "INVALID_ACCESS_TOKEN");

    const ordinaryUser = await createUser();
    const missingProfile = await searchOpportunities(ordinaryUser.token);
    assert.equal(missingProfile.status, 403);
    assert.equal(missingProfile.body.code, "AGENT_PROFILE_REQUIRED");

    const inactiveAgent = await createAgent({ status: USER_STATUSES.INACTIVE });
    const inactive = await searchOpportunities(inactiveAgent.token);
    assert.equal(inactive.status, 403);
    assert.equal(inactive.body.code, "ACCOUNT_INACTIVE");

    const suspendedAgent = await createAgent({ status: USER_STATUSES.SUSPENDED });
    const suspended = await searchOpportunities(suspendedAgent.token);
    assert.equal(suspended.status, 403);
    assert.equal(suspended.body.code, "ACCOUNT_SUSPENDED");

    const deletedProfileAgent = await createAgent();
    await AgentProfile.updateOne(
      { _id: deletedProfileAgent.agentProfile._id },
      { $set: { isDeleted: true } },
    );
    const deletedProfile = await searchOpportunities(deletedProfileAgent.token);
    assert.equal(deletedProfile.status, 403);
    assert.equal(deletedProfile.body.code, "AGENT_PROFILE_REQUIRED");
  });

  test("rejects malformed geometry, missing pagination, and invalid matchStatus", async () => {
    const agent = await createAgent();

    const openPolygon = await searchOpportunities(agent.token, {
      ...searchBody,
      area: {
        type: "Polygon",
        coordinates: [[[100, 13], [101, 13], [101, 14], [100, 14]]],
      },
    });
    assert.equal(openPolygon.status, 422);
    assert.equal(openPolygon.body.code, "VALIDATION_ERROR");

    const selfIntersectingPolygon = await searchOpportunities(agent.token, {
      ...searchBody,
      area: {
        type: "Polygon",
        coordinates: [[
          [100.52, 13.72],
          [100.58, 13.76],
          [100.58, 13.72],
          [100.52, 13.76],
          [100.52, 13.72],
        ]],
      },
    });
    assert.equal(selfIntersectingPolygon.status, 422);
    assert.equal(selfIntersectingPolygon.body.message, "area.coordinates[0] must not self-intersect");

    const zeroAreaPolygon = await searchOpportunities(agent.token, {
        area: {
          type: "Polygon",
          coordinates: [
            [
              [100.53, 13.73],
              [100.54, 13.74],
              [100.55, 13.75],
              [100.53, 13.73],
            ],
          ],
        },
        pagination: { page: 1, limit: 20 },
      });

    assert.equal(zeroAreaPolygon.status, 422);
    assert.equal(
      zeroAreaPolygon.body.message,
      "area.coordinates[0] must enclose a non-zero area",
    );

    const invalidHole = await searchOpportunities(agent.token, {
      ...searchBody,
      area: {
        type: "Polygon",
        coordinates: [
          [[100.52, 13.72], [100.58, 13.72], [100.58, 13.76], [100.52, 13.76], [100.52, 13.72]],
          [[100.57, 13.74], [100.59, 13.74], [100.59, 13.75], [100.57, 13.75], [100.57, 13.74]],
        ],
      },
    });
    assert.equal(invalidHole.status, 422);
    assert.match(invalidHole.body.message, /must be contained within the exterior ring/);

    const missingPagination = await searchOpportunities(agent.token, {
      area: searchBody.area,
    });
    assert.equal(missingPagination.status, 422);

    const invalidMatchStatus = await searchOpportunities(agent.token, {
      ...searchBody,
      matchStatus: "future",
    });
    assert.equal(invalidMatchStatus.status, 422);
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
    assert.equal(response.body.data[0].myMatchingBuildingCount, 0);
    assert.equal(response.body.data[0].platformMatchingBuildingCount, 0);
    assert.equal(response.body.data[0].matchingBuildingCountCapped, false);
    assert.deepEqual(response.body.pagination, {
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  test("sorts by lastConfirmedAt, then createdAt", async () => {
    const { token, user } = await createUser();
    const stale = await seedSavedSearch({
      user,
      name: "Stale confirmation",
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });
    const tieOlder = await seedSavedSearch({
      user,
      name: "Same confirmation older creation",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    const tieNewer = await seedSavedSearch({
      user,
      name: "Same confirmation newer creation",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    const fresh = await seedSavedSearch({
      user,
      name: "Fresh confirmation",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await Promise.all([
      SavedSearch.updateOne(
        { _id: stale._id },
        { $set: { lastConfirmedAt: new Date("2026-08-01T00:00:00.000Z") } },
      ),
      SavedSearch.updateOne(
        { _id: tieOlder._id },
        { $set: { lastConfirmedAt: new Date("2026-08-02T00:00:00.000Z") } },
      ),
      SavedSearch.updateOne(
        { _id: tieNewer._id },
        { $set: { lastConfirmedAt: new Date("2026-08-02T00:00:00.000Z") } },
      ),
      SavedSearch.updateOne(
        { _id: fresh._id },
        { $set: { lastConfirmedAt: new Date("2026-08-03T00:00:00.000Z") } },
      ),
    ]);

    const response = await listSavedSearches({ token });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((item) => item.name),
      [
        "Fresh confirmation",
        "Same confirmation newer creation",
        "Same confirmation older creation",
        "Stale confirmation",
      ],
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

  test("adds matching-building counts only to the Waiting list", async () => {
    const owner = await createAgent();
    const platformAgent = await createAgent();
    await seedSavedSearch({
      user: owner.user,
      name: "Waiting with inventory",
    });
    await seedSavedSearch({
      user: owner.user,
      name: "Closed without enrichment",
      status: SAVED_SEARCH_STATUSES.CLOSED,
    });

    const createMatchingBuilding = async (name, listedBy) => {
      const building = await Building.create({
        name,
        buildingType: BUILDING_TYPES.APARTMENT,
        location: { type: "Point", coordinates: [100.64, 13.765] },
        createdBy: owner.user._id,
      });
      await Listing.create({
        buildingId: building._id,
        listedBy,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 20_000,
        deposit: 20_000,
        moveInCost: 40_000,
        isCookingAllowed: true,
        isPetAllowed: false,
      });
    };

    await createMatchingBuilding("Owner inventory", owner.user._id);
    await createMatchingBuilding("Platform inventory", platformAgent.user._id);

    const waiting = await listSavedSearches({ token: owner.token });

    assert.equal(waiting.status, 200);
    assert.equal(waiting.body.data[0].myMatchingBuildingCount, 1);
    assert.equal(waiting.body.data[0].platformMatchingBuildingCount, 1);
    assert.equal(waiting.body.data[0].matchingBuildingCountCapped, false);
    assert.equal(waiting.body.data[0].geoSearch.coverage, undefined);

    const closed = await listSavedSearches({
      token: owner.token,
      query: "status=Closed",
    });

    assert.equal(closed.status, 200);
    assert.equal(closed.body.data[0].myMatchingBuildingCount, undefined);
    assert.equal(closed.body.data[0].platformMatchingBuildingCount, undefined);
    assert.equal(closed.body.data[0].matchingBuildingCountCapped, undefined);
    assert.equal(closed.body.data[0].geoSearch.coverage, undefined);
  });

  test("gives caller inventory precedence and excludes ineligible inventory", async () => {
    const owner = await createAgent();
    const platformAgent = await createAgent();
    const inactiveAgent = await createAgent();
    const deletedProfileAgent = await createAgent();
    await User.updateOne(
      { _id: inactiveAgent.user._id },
      { $set: { status: USER_STATUSES.INACTIVE } },
    );
    await seedSavedSearch({
      user: owner.user,
      name: "Eligibility matrix",
      filters: {
        maxRent: 25_000,
        buildingType: BUILDING_TYPES.APARTMENT,
        buildingFacilities: ["Lift"],
      },
    });

    const createBuilding = (name, overrides = {}) =>
      Building.create({
        name,
        buildingType: BUILDING_TYPES.APARTMENT,
        facilities: ["Lift"],
        location: { type: "Point", coordinates: [100.64, 13.765] },
        createdBy: owner.user._id,
        ...overrides,
      });
    const createListing = (buildingId, listedBy, overrides = {}) =>
      Listing.create({
        buildingId,
        listedBy,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 20_000,
        deposit: 20_000,
        moveInCost: 40_000,
        isCookingAllowed: true,
        isPetAllowed: false,
        ...overrides,
      });

    const sharedBuilding = await createBuilding("Mine wins");
    await createListing(sharedBuilding._id, platformAgent.user._id);
    await createListing(sharedBuilding._id, owner.user._id);

    const platformBuilding = await createBuilding("Platform only");
    await createListing(platformBuilding._id, platformAgent.user._id);

    const inactiveBuilding = await createBuilding("Inactive building", {
      isActive: false,
    });
    await createListing(inactiveBuilding._id, platformAgent.user._id);

    const outsideBuilding = await createBuilding("Outside coverage", {
      location: { type: "Point", coordinates: [101.64, 14.765] },
    });
    await createListing(outsideBuilding._id, platformAgent.user._id);

    const buildingFilterMismatch = await createBuilding(
      "Building filter mismatch",
      { facilities: [] },
    );
    await createListing(buildingFilterMismatch._id, platformAgent.user._id);

    const listingFilterMismatch = await createBuilding(
      "Listing filter mismatch",
    );
    await createListing(listingFilterMismatch._id, platformAgent.user._id, {
      rent: 30_000,
    });

    const privateListingBuilding = await createBuilding("Private listing");
    await createListing(privateListingBuilding._id, platformAgent.user._id, {
      visibility: LISTING_VISIBILITIES.PRIVATE,
    });

    const deletedListingBuilding = await createBuilding("Deleted listing");
    await createListing(deletedListingBuilding._id, platformAgent.user._id, {
      isDeleted: true,
    });

    const inactiveListerBuilding = await createBuilding("Inactive lister");
    await createListing(inactiveListerBuilding._id, inactiveAgent.user._id);

    const deletedProfileBuilding = await createBuilding("Deleted profile");
    await AgentProfile.updateOne(
      { _id: deletedProfileAgent.agentProfile._id },
      { $set: { isDeleted: true } },
    );
    await createListing(
      deletedProfileBuilding._id,
      deletedProfileAgent.user._id,
    );

    const response = await listSavedSearches({ token: owner.token });

    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].myMatchingBuildingCount, 1);
    assert.equal(response.body.data[0].platformMatchingBuildingCount, 1);
    assert.equal(response.body.data[0].matchingBuildingCountCapped, false);
  });

  test("caps Waiting counts at twenty and reports truncation", async () => {
    const owner = await createAgent();
    const platformAgent = await createAgent();
    await seedSavedSearch({ user: owner.user, name: "Capped owner list" });

    const buildings = await Building.create(
      Array.from({ length: 21 }, (_, index) => ({
        name: `Owner-list cap building ${index}`,
        buildingType: BUILDING_TYPES.APARTMENT,
        location: { type: "Point", coordinates: [100.64, 13.765] },
        createdBy: owner.user._id,
      })),
    );
    await Listing.create(
      buildings.map((building) => ({
        buildingId: building._id,
        listedBy: platformAgent.user._id,
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 20_000,
        deposit: 20_000,
        moveInCost: 40_000,
        isCookingAllowed: true,
        isPetAllowed: false,
      })),
    );

    const response = await listSavedSearches({ token: owner.token });

    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].myMatchingBuildingCount, 0);
    assert.equal(response.body.data[0].platformMatchingBuildingCount, 20);
    assert.equal(response.body.data[0].matchingBuildingCountCapped, true);
  });

  test("enriches only the requested Waiting page and preserves pagination", async () => {
    const owner = await createAgent();
    const platformAgent = await createAgent();
    const firstPageSearch = await seedSavedSearch({
      user: owner.user,
      name: "First page",
      availableBy: validateAvailableBy("2026-09-01"),
    });
    const secondPageSearch = await seedSavedSearch({
      user: owner.user,
      name: "Second page",
      availableBy: validateAvailableBy("2026-10-01"),
      filters: { minRent: 0, maxRent: 1_000 },
    });
    await Promise.all([
      SavedSearch.updateOne(
        { _id: firstPageSearch._id },
        { $set: { lastConfirmedAt: new Date("2026-08-02T00:00:00.000Z") } },
      ),
      SavedSearch.updateOne(
        { _id: secondPageSearch._id },
        { $set: { lastConfirmedAt: new Date("2026-08-01T00:00:00.000Z") } },
      ),
    ]);
    const building = await Building.create({
      name: "Page-scoped matching building",
      buildingType: BUILDING_TYPES.APARTMENT,
      location: { type: "Point", coordinates: [100.64, 13.765] },
      createdBy: owner.user._id,
    });
    await Listing.create({
      buildingId: building._id,
      listedBy: platformAgent.user._id,
      visibility: LISTING_VISIBILITIES.PUBLIC,
      isForeignerAccepted: true,
      isTM30Provided: true,
      rent: 20_000,
      deposit: 20_000,
      moveInCost: 40_000,
      isCookingAllowed: true,
      isPetAllowed: false,
    });

    const page1 = await listSavedSearches({
      token: owner.token,
      query: "status=Waiting&page=1&limit=1",
    });
    assert.deepEqual(page1.body.pagination, { page: 1, limit: 1, total: 2 });
    assert.equal(page1.body.data[0].name, "First page");
    assert.equal(page1.body.data[0].platformMatchingBuildingCount, 1);

    const page2 = await listSavedSearches({
      token: owner.token,
      query: "status=Waiting&page=2&limit=1",
    });
    assert.deepEqual(page2.body.pagination, { page: 2, limit: 1, total: 2 });
    assert.equal(page2.body.data[0].name, "Second page");
    assert.equal(page2.body.data[0].platformMatchingBuildingCount, 0);
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
