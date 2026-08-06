import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, afterEach, before, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import {
  GEO_SEARCH_MODES,
  SAVED_SEARCH_STATUSES,
} from "../modules/saved-search/saved-search.constants.js";
import { BUILDING_TYPES } from "../modules/building/building.constants.js";
import {
  KITCHEN_TYPES,
  LISTING_VISIBILITIES,
} from "../modules/listing/listing.constants.js";
import { USER_STATUSES } from "../modules/user/user.constants.js";

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

const demandOpportunitiesBasePath = "/api/v1/agent-demand-opportunities";

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

const createUser = async ({ status = USER_STATUSES.ACTIVE } = {}) => {
  const user = await User.create({
    name: `Demand opportunity by id ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
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
    displayName: "Demand Opportunity Detail Agent",
    supportLanguages: ["English"],
  });
  return { ...actor, agentProfile };
};

const seedSavedSearch = async ({
  user,
  name,
  status = SAVED_SEARCH_STATUSES.WAITING,
  isDeleted = false,
  filters: filterOverrides = {},
}) => {
  const doc = await SavedSearch.create({
    createdBy: user._id,
    name,
    description: "Private owner note",
    status,
    geoSearch: {
      mode: GEO_SEARCH_MODES.AREA,
      bounds: validBounds,
      placeName: "Siam",
    },
    filters: {
      minRent: 15_000,
      ...filterOverrides,
    },
    isDeleted,
    deletedAt: isDeleted ? new Date() : null,
  });

  return SavedSearch.findById(doc._id);
};

const getOpportunityById = ({ token, opportunityId }) =>
  request(`${demandOpportunitiesBasePath}/${opportunityId}`, {
    method: "GET",
    headers: token ? bearerHeaders(token) : undefined,
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

  process.env.MONGODB_URI = replSet.getUri(
    "agent_demand_opportunity_get_by_id_test",
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
  ] = await Promise.all([
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

afterEach(async () => {
  await Promise.all([
    SavedSearch.deleteMany({}),
    Listing.deleteMany({}),
    Building.deleteMany({}),
    AgentProfile.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
});

describe("GET /api/v1/agent-demand-opportunities/:opportunityId", () => {
  test("returns a public Waiting opportunity with matching counts and stripped private fields", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    const opportunity = await seedSavedSearch({
      user: owner.user,
      name: "Private opportunity name",
      filters: {
        maxRent: 30_000,
        bedroomCount: 1,
      },
    });

    const building = await Building.create({
      name: `Matching building ${new mongoose.Types.ObjectId()}`,
      buildingType: BUILDING_TYPES.APARTMENT,
      facilities: [],
      security: [],
      location: { type: "Point", coordinates: [100.64, 13.765] },
      createdBy: owner.user._id,
    });
    await Listing.create({
      buildingId: building._id,
      listedBy: agent.user._id,
      visibility: LISTING_VISIBILITIES.PUBLIC,
      isForeignerAccepted: true,
      isTM30Provided: true,
      isCookingAllowed: true,
      isPetAllowed: true,
      rent: 20_000,
      deposit: 20_000,
      moveInCost: 40_000,
      bedroomCount: 1,
      bathroomCount: 1,
      kitchenType: KITCHEN_TYPES.KITCHEN,
      contractMonths: 6,
      occupancy: 1,
      facilities: [],
      availableAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const response = await getOpportunityById({
      token: agent.token,
      opportunityId: opportunity._id.toString(),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data._id, opportunity._id.toString());
    assert.equal(response.body.data.status, SAVED_SEARCH_STATUSES.WAITING);
    assert.equal(response.body.data.name, undefined);
    assert.equal(response.body.data.description, undefined);
    assert.equal(response.body.data.createdBy, undefined);
    assert.equal(response.body.data.title, undefined);
    assert.equal(response.body.data.isDeleted, undefined);
    assert.equal(response.body.data.geoSearch.coverage, undefined);
    assert.equal(response.body.data.geoSearch.placeName, "Siam");
    assert.equal(response.body.data.opportunityRanking, undefined);
    assert.equal(response.body.data.myMatchingBuildingCount, 1);
    assert.equal(response.body.data.platformMatchingBuildingCount, 0);
    assert.equal(response.body.data.matchingBuildingCountCapped, false);
  });

  test("returns 404 for missing, Closed, and soft-deleted opportunities", async () => {
    const agent = await createAgent();
    const owner = await createUser();
    const closed = await seedSavedSearch({
      user: owner.user,
      name: "Closed opportunity",
      status: SAVED_SEARCH_STATUSES.CLOSED,
    });
    const deleted = await seedSavedSearch({
      user: owner.user,
      name: "Deleted opportunity",
      isDeleted: true,
    });

    const missing = await getOpportunityById({
      token: agent.token,
      opportunityId: new mongoose.Types.ObjectId().toString(),
    });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND");
    assertRequestId(missing);

    const closedResponse = await getOpportunityById({
      token: agent.token,
      opportunityId: closed._id.toString(),
    });
    assert.equal(closedResponse.status, 404);
    assert.equal(
      closedResponse.body.code,
      "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
    );

    const deletedResponse = await getOpportunityById({
      token: agent.token,
      opportunityId: deleted._id.toString(),
    });
    assert.equal(deletedResponse.status, 404);
    assert.equal(
      deletedResponse.body.code,
      "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
    );
  });

  test("enforces auth and agent profile gates", async () => {
    const owner = await createUser();
    const opportunity = await seedSavedSearch({
      user: owner.user,
      name: "Auth gate opportunity",
    });
    const opportunityId = opportunity._id.toString();

    const unauthenticated = await getOpportunityById({
      token: null,
      opportunityId,
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.code, "ACCESS_TOKEN_REQUIRED");
    assertRequestId(unauthenticated);

    const ordinaryUser = await createUser();
    const missingProfile = await getOpportunityById({
      token: ordinaryUser.token,
      opportunityId,
    });
    assert.equal(missingProfile.status, 403);
    assert.equal(missingProfile.body.code, "AGENT_PROFILE_REQUIRED");

    const inactiveAgent = await createAgent({ status: USER_STATUSES.INACTIVE });
    const inactive = await getOpportunityById({
      token: inactiveAgent.token,
      opportunityId,
    });
    assert.equal(inactive.status, 403);
    assert.equal(inactive.body.code, "ACCOUNT_INACTIVE");
  });

  test("returns 422 for an invalid opportunityId", async () => {
    const agent = await createAgent();

    const response = await getOpportunityById({
      token: agent.token,
      opportunityId: "not-an-id",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assertRequestId(response);
  });
});
