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
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

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

let AgentProfile;
let Building;
let Listing;
let User;
let baseUrl;
let httpServer;
let replSet;

const augustTenth = startOfCalendarDayInTimeZone("2026-08-10");
const augustFifteenth = startOfCalendarDayInTimeZone("2026-08-15");
const augustTwentieth = startOfCalendarDayInTimeZone("2026-08-20");

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const createListing = async ({
  userId,
  buildingId,
  availableAt,
  rent = 14000,
} = {}) => {
  return Listing.create({
    visibility: LISTING_VISIBILITIES.PUBLIC,
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
        publicId: "listing/available-by-photo",
        secureUrl: "https://example.com/photo.jpg",
      },
    ],
    description: "AvailableBy filter room",
    availableAt,
    listedBy: userId,
    buildingId,
  });
};

const createSearchFixture = async () => {
  const user = await User.create({
    name: "AvailableBy Owner",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  await AgentProfile.create({
    userId: user._id,
    displayName: "AvailableBy Agent",
    supportLanguages: ["English"],
  });

  const building = await Building.create({
    name: "AvailableBy Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
    minRent: 14000,
    maxRent: 16000,
  });

  const flexible = await createListing({
    userId: user._id,
    buildingId: building._id,
    availableAt: null,
    rent: 14000,
  });
  const earlier = await createListing({
    userId: user._id,
    buildingId: building._id,
    availableAt: augustTenth,
    rent: 15000,
  });
  const exact = await createListing({
    userId: user._id,
    buildingId: building._id,
    availableAt: augustFifteenth,
    rent: 15500,
  });
  const later = await createListing({
    userId: user._id,
    buildingId: building._id,
    availableAt: augustTwentieth,
    rent: 16000,
  });

  return { building, earlier, exact, flexible, later, user };
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

  process.env.MONGODB_URI = replSet.getUri("search_available_by_filter_test");

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

describe("availableBy listing search filter", () => {
  test("returns Flexible and listings available on or before availableBy", async () => {
    const { building, earlier, exact, flexible, later } =
      await createSearchFixture();

    const response = await request(
      `/api/v1/search/buildings/${building._id.toString()}/listings`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableBy: "2026-08-15" }),
      },
    );

    assert.equal(response.status, 200);

    const listingIds = response.body.data.listings.map((listing) => listing._id);

    assert.equal(listingIds.includes(flexible._id.toString()), true);
    assert.equal(listingIds.includes(earlier._id.toString()), true);
    assert.equal(listingIds.includes(exact._id.toString()), true);
    assert.equal(listingIds.includes(later._id.toString()), false);
  });

  test("omits availableBy when null and returns all public listings", async () => {
    const { building, earlier, exact, flexible, later } =
      await createSearchFixture();

    const response = await request(
      `/api/v1/search/buildings/${building._id.toString()}/listings`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableBy: null }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 4);

    const listingIds = response.body.data.listings.map((listing) => listing._id);
    assert.equal(listingIds.includes(flexible._id.toString()), true);
    assert.equal(listingIds.includes(earlier._id.toString()), true);
    assert.equal(listingIds.includes(exact._id.toString()), true);
    assert.equal(listingIds.includes(later._id.toString()), true);
  });

  test("returns 422 for invalid availableBy", async () => {
    const { building } = await createSearchFixture();

    const response = await request(
      `/api/v1/search/buildings/${building._id.toString()}/listings`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ availableBy: "" }),
      },
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /availableBy/);
  });
});
