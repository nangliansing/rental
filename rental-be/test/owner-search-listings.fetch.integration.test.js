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
import { USER_ROLES, USER_STATUSES } from "../modules/user/user.constants.js";
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
const OWNER_LISTINGS_PATH = "/api/v1/listings";

let AgentProfile;
let Building;
let Listing;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

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

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
});

const ownerListings = (query = "", token) =>
  request(`${OWNER_LISTINGS_PATH}${query}`, {
    headers: bearerHeaders(token),
  });

const listingFields = ({
  userId,
  buildingId,
  visibility = LISTING_VISIBILITIES.PUBLIC,
  availableAt = today,
  rent = 14000,
  description = "Owner search test room",
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
      publicId: "listing/owner-search-photo",
      secureUrl: "https://example.com/photo.jpg",
    },
  ],
  description,
  availableAt,
  listedBy: userId,
  buildingId,
  isDeleted,
});

const createOwnerContext = async ({ withAgentProfile = true } = {}) => {
  const user = await User.create({
    name: "Owner Search User",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  if (withAgentProfile) {
    await AgentProfile.create({
      userId: user._id,
      displayName: "Owner Search Agent",
      supportLanguages: ["English"],
    });
  }

  const building = await Building.create({
    name: "Owner Search Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
    minRent: 14000,
    maxRent: 18000,
  });

  return {
    building,
    token: signAccessToken(user),
    user,
  };
};

const createListing = async ({
  userId,
  buildingId,
  visibility = LISTING_VISIBILITIES.PUBLIC,
  availableAt = today,
  rent = 14000,
  description = "Owner search test room",
  isDeleted = false,
  updatedAt,
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

  if (updatedAt) {
    await Listing.collection.updateOne(
      { _id: listing._id },
      { $set: { updatedAt } },
    );
  }

  return listing;
};

const createOwnerSearchFixture = async () => {
  const owner = await createOwnerContext();
  const otherOwner = await createOwnerContext();

  const flexiblePublic = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: null,
    rent: 14000,
    description: "Flexible public",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const availableYesterday = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: yesterday,
    rent: 15000,
    description: "Available yesterday",
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  const availableToday = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: today,
    rent: 15500,
    description: "Available today",
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  });
  const availableTomorrow = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: tomorrow,
    rent: 16000,
    description: "Available tomorrow",
    updatedAt: new Date("2026-01-07T00:00:00.000Z"),
  });
  const availableLater = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: dayAfterTomorrow,
    rent: 16500,
    description: "Available later",
    updatedAt: new Date("2026-01-04T00:00:00.000Z"),
  });
  const availableEvenLater = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: inThreeDays,
    rent: 17000,
    description: "Available even later",
    updatedAt: new Date("2026-01-05T00:00:00.000Z"),
  });
  const privateListing = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    visibility: LISTING_VISIBILITIES.PRIVATE,
    availableAt: tomorrow,
    rent: 17500,
    description: "Private listing",
    updatedAt: new Date("2026-01-06T00:00:00.000Z"),
  });
  const deletedListing = await createListing({
    userId: owner.user._id,
    buildingId: owner.building._id,
    availableAt: today,
    rent: 18000,
    description: "Deleted listing",
    isDeleted: true,
  });
  const otherOwnerListing = await createListing({
    userId: otherOwner.user._id,
    buildingId: otherOwner.building._id,
    availableAt: today,
    rent: 19000,
    description: "Other owner listing",
  });

  return {
    ...owner,
    otherOwner,
    listings: {
      flexiblePublic,
      availableYesterday,
      availableToday,
      availableTomorrow,
      availableLater,
      availableEvenLater,
      privateListing,
      deletedListing,
      otherOwnerListing,
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

  process.env.MONGODB_URI = replSet.getUri("owner_search_listings_fetch_test");

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
    agentProfileModule,
    buildingModule,
    listingModule,
    userModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../shared/auth/index.js"),
    import("../modules/agent/agent-profile.model.js"),
    import("../modules/building/building.model.js"),
    import("../modules/listing/listing.model.js"),
    import("../modules/user/user.model.js"),
  ]);

  signAccessToken = authModule.signAccessToken;
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

describe("GET /api/v1/listings authentication", () => {
  test("requires an access token", async () => {
    const response = await request(OWNER_LISTINGS_PATH);

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
  });

  test("rejects an invalid access token", async () => {
    const response = await ownerListings("", "invalid-token");

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
  });

  test("rejects a suspended user", async () => {
    const user = await User.create({
      name: "Suspended Owner",
      email: `${new mongoose.Types.ObjectId()}@example.com`,
      status: USER_STATUSES.SUSPENDED,
    });
    const response = await ownerListings("", signAccessToken(user));

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "ACCOUNT_SUSPENDED");
  });

  test("rejects an inactive user", async () => {
    const user = await User.create({
      name: "Inactive Owner",
      email: `${new mongoose.Types.ObjectId()}@example.com`,
      status: USER_STATUSES.INACTIVE,
    });
    const response = await ownerListings("", signAccessToken(user));

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "ACCOUNT_INACTIVE");
  });

  test("rejects a token whose user no longer exists", async () => {
    const response = await ownerListings(
      "",
      signAccessToken({
        _id: new mongoose.Types.ObjectId(),
        role: USER_ROLES.USER,
      }),
    );

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
  });
});

describe("GET /api/v1/listings default response", () => {
  test("returns agent profile, non-deleted owner listings, and pagination", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.agentProfile.displayName, "Owner Search Agent");
    assert.equal(response.body.pagination.page, 1);
    assert.equal(response.body.pagination.limit, 20);
    assert.equal(response.body.pagination.total, 7);

    const ids = listingIds(response);
    assert.equal(ids.includes(fixture.listings.flexiblePublic._id.toString()), true);
    assert.equal(ids.includes(fixture.listings.availableYesterday._id.toString()), true);
    assert.equal(ids.includes(fixture.listings.privateListing._id.toString()), true);
    assert.equal(ids.includes(fixture.listings.deletedListing._id.toString()), false);
    assert.equal(ids.includes(fixture.listings.otherOwnerListing._id.toString()), false);
  });

  test("returns agentProfile null when the caller has no agent profile", async () => {
    const owner = await createOwnerContext({ withAgentProfile: false });
    await createListing({
      userId: owner.user._id,
      buildingId: owner.building._id,
    });

    const response = await ownerListings("", owner.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.agentProfile, null);
    assert.equal(response.body.data.listings.length, 1);
  });

  test("returns an empty list when the caller has no listings", async () => {
    const owner = await createOwnerContext();
    const response = await ownerListings("", owner.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 0);
    assert.equal(response.body.pagination.total, 0);
  });
});

describe("GET /api/v1/listings filters", () => {
  test("filter=all returns every non-deleted owner listing", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=all", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 7);
  });

  test("filter=now returns public listings available today or earlier with a set date", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=now", fixture.token);

    assert.equal(response.status, 200);

    const ids = listingIds(response);
    assert.deepEqual(ids.sort(), [
      fixture.listings.availableToday._id.toString(),
      fixture.listings.availableYesterday._id.toString(),
    ].sort());
    assert.equal(ids.includes(fixture.listings.flexiblePublic._id.toString()), false);
    assert.equal(ids.includes(fixture.listings.availableTomorrow._id.toString()), false);
    assert.equal(ids.includes(fixture.listings.privateListing._id.toString()), false);
  });

  test("filter=soon returns public listings available from tomorrow onward", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=soon", fixture.token);

    assert.equal(response.status, 200);

    const ids = listingIds(response);
    assert.deepEqual(ids, [
      fixture.listings.availableTomorrow._id.toString(),
      fixture.listings.availableLater._id.toString(),
      fixture.listings.availableEvenLater._id.toString(),
    ]);
  });

  test("filter=private returns only private listings", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=private", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assert.equal(
      response.body.data.listings[0]._id,
      fixture.listings.privateListing._id.toString(),
    );
  });

  test("normalizes filter casing", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=SOON", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 3);
  });

  test("filter takes precedence over legacy visibility", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings(
      "?filter=private&visibility=PUBLIC",
      fixture.token,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assert.equal(
      response.body.data.listings[0].visibility,
      LISTING_VISIBILITIES.PRIVATE,
    );
  });
});

describe("GET /api/v1/listings legacy visibility", () => {
  test("visibility=PUBLIC returns only public listings when filter is absent", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?visibility=PUBLIC", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 6);
    assert.equal(
      response.body.data.listings.every(
        (listing) => listing.visibility === LISTING_VISIBILITIES.PUBLIC,
      ),
      true,
    );
  });

  test("visibility=PRIVATE returns only private listings when filter is absent", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?visibility=private", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assert.equal(
      response.body.data.listings[0]._id,
      fixture.listings.privateListing._id.toString(),
    );
  });

  test("visibility=ALL behaves like the default owner listing query", async () => {
    const fixture = await createOwnerSearchFixture();
    const defaultResponse = await ownerListings("", fixture.token);
    const allVisibilityResponse = await ownerListings(
      "?visibility=ALL",
      fixture.token,
    );

    assert.equal(allVisibilityResponse.status, 200);
    assert.deepEqual(
      listingIds(allVisibilityResponse).sort(),
      listingIds(defaultResponse).sort(),
    );
  });
});

describe("GET /api/v1/listings sorting", () => {
  test("sort=latest orders by updatedAt descending for non-soon filters", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=all&sort=latest", fixture.token);

    assert.equal(response.status, 200);

    const ids = listingIds(response);
    assert.equal(ids[0], fixture.listings.availableTomorrow._id.toString());
    assert.equal(ids.at(-1), fixture.listings.flexiblePublic._id.toString());
  });

  test("sort=oldest orders by updatedAt ascending for non-soon filters", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=all&sort=oldest", fixture.token);

    assert.equal(response.status, 200);

    const ids = listingIds(response);
    assert.equal(ids[0], fixture.listings.flexiblePublic._id.toString());
    assert.equal(ids.at(-1), fixture.listings.availableTomorrow._id.toString());
  });

  test("filter=soon sorts by availableAt ascending regardless of updatedAt", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=soon&sort=latest", fixture.token);

    assert.equal(response.status, 200);

    const ids = listingIds(response);
    assert.deepEqual(ids, [
      fixture.listings.availableTomorrow._id.toString(),
      fixture.listings.availableLater._id.toString(),
      fixture.listings.availableEvenLater._id.toString(),
    ]);
  });

  test("normalizes sort casing", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings("?filter=all&sort=OLDEST", fixture.token);

    assert.equal(response.status, 200);
    assert.equal(
      listingIds(response)[0],
      fixture.listings.flexiblePublic._id.toString(),
    );
  });
});

describe("GET /api/v1/listings pagination", () => {
  test("supports explicit page and limit", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings(
      "?filter=all&sort=latest&page=1&limit=3",
      fixture.token,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 3);
    assert.equal(response.body.pagination.page, 1);
    assert.equal(response.body.pagination.limit, 3);
    assert.equal(response.body.pagination.total, 7);
  });

  test("returns the next page without changing total", async () => {
    const fixture = await createOwnerSearchFixture();
    const firstPage = await ownerListings(
      "?filter=all&sort=latest&page=1&limit=3",
      fixture.token,
    );
    const secondPage = await ownerListings(
      "?filter=all&sort=latest&page=2&limit=3",
      fixture.token,
    );

    assert.equal(secondPage.status, 200);
    assert.equal(secondPage.body.data.listings.length, 3);
    assert.equal(secondPage.body.pagination.page, 2);
    assert.equal(secondPage.body.pagination.total, 7);

    const firstIds = listingIds(firstPage);
    const secondIds = listingIds(secondPage);
    assert.equal(
      firstIds.some((id) => secondIds.includes(id)),
      false,
    );
  });

  test("returns an empty page when page exceeds total results", async () => {
    const fixture = await createOwnerSearchFixture();
    const response = await ownerListings(
      "?filter=all&page=100&limit=20",
      fixture.token,
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 0);
    assert.equal(response.body.pagination.total, 7);
    assert.equal(response.body.pagination.page, 100);
  });
});

describe("GET /api/v1/listings validation", () => {
  test("rejects invalid filter values", async () => {
    const owner = await createOwnerContext();
    const response = await ownerListings("?filter=bad", owner.token);

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /Invalid filter/);
  });

  test("rejects duplicate filter parameters", async () => {
    const owner = await createOwnerContext();
    const response = await ownerListings("?filter=now&filter=soon", owner.token);

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /filter must be a string/);
  });

  test("rejects invalid visibility values", async () => {
    const owner = await createOwnerContext();
    const response = await ownerListings("?visibility=BAD", owner.token);

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /Invalid visibility/);
  });

  test("rejects invalid sort values", async () => {
    const owner = await createOwnerContext();
    const response = await ownerListings("?sort=bad", owner.token);

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /Invalid sort/);
  });

  test("rejects invalid page and limit values", async () => {
    const owner = await createOwnerContext();

    const invalidPage = await ownerListings("?page=0", owner.token);
    assert.equal(invalidPage.status, 422);
    assert.match(invalidPage.body.message, /page must be between 1 and 10000/);

    const invalidLimit = await ownerListings("?limit=101", owner.token);
    assert.equal(invalidLimit.status, 422);
    assert.match(invalidLimit.body.message, /limit must be between 1 and 100/);
  });
});

describe("GET /api/v1/listings response shape", () => {
  test("includes building, availableAt, and isSavedByMe on each listing", async () => {
    const owner = await createOwnerContext();
    const listing = await createListing({
      userId: owner.user._id,
      buildingId: owner.building._id,
      availableAt: tomorrow,
    });

    const response = await ownerListings("?filter=soon", owner.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);

    const item = response.body.data.listings[0];
    assert.equal(item._id, listing._id.toString());
    assert.equal(item.building._id, owner.building._id.toString());
    assert.equal(new Date(item.availableAt).getTime(), tomorrow.getTime());
    assert.equal(item.isSavedByMe, false);
  });
});
