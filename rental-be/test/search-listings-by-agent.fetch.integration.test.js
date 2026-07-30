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

import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import {
  getCalendarDateKeyInTimeZone,
  startOfCalendarDayInTimeZone,
} from "../shared/validators/index.js";

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
process.env.RATE_LIMIT_SEARCH_MAX = "1000";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

let AgentProfile;
let Building;
let Listing;
let User;
let baseUrl;
let httpServer;
let replSet;

const bangkokDayOffset = (offsetDays) => {
  const todayKey = getCalendarDateKeyInTimeZone(new Date());
  const todayStart = startOfCalendarDayInTimeZone(todayKey);

  return new Date(todayStart.getTime() + offsetDays * MS_PER_DAY);
};

const yesterday = bangkokDayOffset(-1);
const today = bangkokDayOffset(0);
const tomorrow = bangkokDayOffset(1);
const dayAfterTomorrow = bangkokDayOffset(2);
const inThreeDays = bangkokDayOffset(3);

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const agentListings = (agentProfileId, query = "") =>
  request(`/api/v1/search/agents/${agentProfileId}/listings${query}`);

const listingFields = ({
  userId,
  buildingId,
  visibility = LISTING_VISIBILITIES.PUBLIC,
  availableAt = today,
  rent = 14000,
  description = "Agent search test room",
  isDeleted = false,
}) => ({
  visibility,
  isForeignerAccepted: true,
  isTM30Provided: false,
  rent,
  deposit: 28000,
  moveInCost: 42000,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
  contractMonths: 3,
  occupancy: 1,
  isCookingAllowed: true,
  isPetAllowed: false,
  facilities: [],
  media: [
    {
      publicId: "listing/agent-search-photo",
      secureUrl: "https://example.com/photo.jpg",
    },
  ],
  description,
  availableAt,
  listedBy: userId,
  buildingId,
  isDeleted,
});

const createAgentContext = async () => {
  const user = await User.create({
    name: "Agent Search User",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  const agentProfile = await AgentProfile.create({
    userId: user._id,
    displayName: "Agent Search Agent",
    supportLanguages: ["English"],
  });

  const building = await Building.create({
    name: "Agent Search Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
    minRent: 14000,
    maxRent: 18000,
  });

  return { agentProfile, building, user };
};

const createListing = async ({
  userId,
  buildingId,
  visibility = LISTING_VISIBILITIES.PUBLIC,
  availableAt = today,
  rent = 14000,
  description = "Agent search test room",
  isDeleted = false,
  createdAt,
}) => {
  const listing = await Listing.create(
    listingFields({
      userId,
      buildingId,
      visibility,
      availableAt,
      rent,
      description,
      isDeleted,
    }),
  );

  if (createdAt) {
    await Listing.collection.updateOne(
      { _id: listing._id },
      { $set: { createdAt } },
    );
  }

  return listing;
};

const createAgentSearchFixture = async () => {
  const agent = await createAgentContext();
  const otherAgent = await createAgentContext();

  const flexiblePublic = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: null,
    rent: 14000,
    description: "Flexible public",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const availableYesterday = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: yesterday,
    rent: 15000,
    description: "Available yesterday",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  const availableToday = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: today,
    rent: 15500,
    description: "Available today",
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
  });
  const availableTomorrow = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: tomorrow,
    rent: 16000,
    description: "Available tomorrow",
    createdAt: new Date("2026-01-07T00:00:00.000Z"),
  });
  const availableLater = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: dayAfterTomorrow,
    rent: 16500,
    description: "Available later",
    createdAt: new Date("2026-01-04T00:00:00.000Z"),
  });
  const availableEvenLater = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: inThreeDays,
    rent: 17000,
    description: "Available even later",
    createdAt: new Date("2026-01-05T00:00:00.000Z"),
  });
  const privateListing = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    visibility: LISTING_VISIBILITIES.PRIVATE,
    availableAt: tomorrow,
    rent: 17500,
    description: "Private listing",
    createdAt: new Date("2026-01-06T00:00:00.000Z"),
  });
  const deletedListing = await createListing({
    userId: agent.user._id,
    buildingId: agent.building._id,
    availableAt: today,
    rent: 18000,
    description: "Deleted listing",
    isDeleted: true,
  });
  const otherAgentListing = await createListing({
    userId: otherAgent.user._id,
    buildingId: otherAgent.building._id,
    availableAt: today,
    rent: 19000,
    description: "Other agent listing",
  });

  const inactiveBuilding = await Building.create({
    name: "Inactive Agent Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.502, 13.76] },
    address: "Bangkok inactive",
    createdBy: agent.user._id,
    isActive: false,
    minRent: 14000,
    maxRent: 18000,
  });
  const inactiveBuildingListing = await createListing({
    userId: agent.user._id,
    buildingId: inactiveBuilding._id,
    availableAt: today,
    rent: 20000,
    description: "Inactive building listing",
    createdAt: new Date("2026-01-08T00:00:00.000Z"),
  });

  return {
    ...agent,
    listings: {
      flexiblePublic,
      availableYesterday,
      availableToday,
      availableTomorrow,
      availableLater,
      availableEvenLater,
      privateListing,
      deletedListing,
      otherAgentListing,
      inactiveBuildingListing,
    },
  };
};

const listingIds = (response) =>
  response.body.data.listings.map((listing) => listing._id);

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

  process.env.MONGODB_URI = replSet.getUri("search_listings_by_agent_fetch_test");

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
    agentProfileModule,
    buildingModule,
    listingModule,
    userModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../modules/agent/agent-profile.model.js"),
    import("../modules/building/building.model.js"),
    import("../modules/listing/listing.model.js"),
    import("../modules/user/user.model.js"),
  ]);

  AgentProfile = agentProfileModule.default;
  Building = buildingModule.default;
  Listing = listingModule.default;
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

describe("GET /api/v1/search/agents/:agentProfileId/listings filters", () => {
  test("default query returns all visible public listings for the agent", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(fixture.agentProfile._id.toString());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.agentProfile._id, fixture.agentProfile._id.toString());
    assert.equal(response.body.pagination.total, 6);
    assert.deepEqual(listingIds(response).sort(), [
      fixture.listings.flexiblePublic._id.toString(),
      fixture.listings.availableYesterday._id.toString(),
      fixture.listings.availableToday._id.toString(),
      fixture.listings.availableTomorrow._id.toString(),
      fixture.listings.availableLater._id.toString(),
      fixture.listings.availableEvenLater._id.toString(),
    ].sort());
  });

  test("filter=now returns public listings available today or earlier with a set date", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=now",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(listingIds(response).sort(), [
      fixture.listings.availableYesterday._id.toString(),
      fixture.listings.availableToday._id.toString(),
    ].sort());
  });

  test("filter=soon returns public listings available from tomorrow onward", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=soon",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(listingIds(response), [
      fixture.listings.availableTomorrow._id.toString(),
      fixture.listings.availableLater._id.toString(),
      fixture.listings.availableEvenLater._id.toString(),
    ]);
  });

  test("flexible public listings appear only under the default all filter", async () => {
    const fixture = await createAgentSearchFixture();

    const nowResponse = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=now",
    );
    const soonResponse = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=soon",
    );

    assert.equal(
      listingIds(nowResponse).includes(fixture.listings.flexiblePublic._id.toString()),
      false,
    );
    assert.equal(
      listingIds(soonResponse).includes(fixture.listings.flexiblePublic._id.toString()),
      false,
    );
  });

  test("never returns private, deleted, other-agent, or inactive-building listings", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=all",
    );

    const ids = listingIds(response);
    assert.equal(ids.includes(fixture.listings.privateListing._id.toString()), false);
    assert.equal(ids.includes(fixture.listings.deletedListing._id.toString()), false);
    assert.equal(ids.includes(fixture.listings.otherAgentListing._id.toString()), false);
    assert.equal(
      ids.includes(fixture.listings.inactiveBuildingListing._id.toString()),
      false,
    );
  });
});

describe("GET /api/v1/search/agents/:agentProfileId/listings sorting", () => {
  test("sort=latest orders by createdAt descending for non-soon filters", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=all&sort=latest",
    );

    assert.equal(response.status, 200);
    assert.equal(
      listingIds(response)[0],
      fixture.listings.availableTomorrow._id.toString(),
    );
    assert.equal(
      listingIds(response).at(-1),
      fixture.listings.flexiblePublic._id.toString(),
    );
  });

  test("filter=soon sorts by availableAt ascending regardless of createdAt", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=soon&sort=latest",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(listingIds(response), [
      fixture.listings.availableTomorrow._id.toString(),
      fixture.listings.availableLater._id.toString(),
      fixture.listings.availableEvenLater._id.toString(),
    ]);
  });

  test("sort=oldest orders by createdAt ascending for non-soon filters", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=all&sort=oldest",
    );

    assert.equal(response.status, 200);
    assert.equal(
      listingIds(response)[0],
      fixture.listings.flexiblePublic._id.toString(),
    );
    assert.equal(
      listingIds(response).at(-1),
      fixture.listings.availableTomorrow._id.toString(),
    );
  });

  test("normalizes filter and sort casing", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=NOW&sort=OLDEST",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(listingIds(response), [
      fixture.listings.availableYesterday._id.toString(),
      fixture.listings.availableToday._id.toString(),
    ]);
  });
});

describe("GET /api/v1/search/agents/:agentProfileId/listings pagination", () => {
  test("paginates filtered results without changing total", async () => {
    const fixture = await createAgentSearchFixture();
    const firstPage = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=all&sort=latest&page=1&limit=2",
    );
    const secondPage = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=all&sort=latest&page=2&limit=2",
    );

    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.body.data.listings.length, 2);
    assert.equal(firstPage.body.pagination.total, 6);

    assert.equal(secondPage.status, 200);
    assert.equal(secondPage.body.data.listings.length, 2);
    assert.equal(secondPage.body.pagination.page, 2);
    assert.equal(secondPage.body.pagination.total, 6);

    const firstIds = listingIds(firstPage);
    const secondIds = listingIds(secondPage);
    assert.equal(firstIds.some((id) => secondIds.includes(id)), false);
  });

  test("returns an empty list when a filter matches no listings", async () => {
    const agent = await createAgentContext();
    await createListing({
      userId: agent.user._id,
      buildingId: agent.building._id,
      availableAt: tomorrow,
      description: "Soon only listing",
    });

    const response = await agentListings(
      agent.agentProfile._id.toString(),
      "?filter=now",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.listings, []);
    assert.equal(response.body.pagination.total, 0);
  });
});

describe("GET /api/v1/search/agents/:agentProfileId/listings validation", () => {
  test("rejects invalid filter values", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=private",
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects invalid sort values", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?sort=random",
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("rejects duplicate filter parameters", async () => {
    const fixture = await createAgentSearchFixture();
    const response = await agentListings(
      fixture.agentProfile._id.toString(),
      "?filter=now&filter=soon",
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("returns AGENT_PROFILE_NOT_FOUND for unknown agent profile", async () => {
    const response = await agentListings(new mongoose.Types.ObjectId().toString());

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "AGENT_PROFILE_NOT_FOUND");
  });
});
