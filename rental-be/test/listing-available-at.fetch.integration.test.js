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
let SavedListing;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const augustFifteenthBangkok = startOfCalendarDayInTimeZone("2026-08-15");

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const assertAvailableAt = (value, expectedDate) => {
  assert.equal(Object.hasOwn({ availableAt: value }, "availableAt"), true);

  if (expectedDate === null) {
    assert.equal(value, null);
    return;
  }

  assert.equal(new Date(value).getTime(), expectedDate.getTime());
};

const createPublicListingFixture = async ({
  availableAt = augustFifteenthBangkok,
  omitAvailableAt = false,
} = {}) => {
  const user = await User.create({
    name: "Listing Owner",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  await AgentProfile.create({
    userId: user._id,
    displayName: "Fetch Agent",
    supportLanguages: ["English"],
  });

  const building = await Building.create({
    name: "Fetch Test Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
    minRent: 14000,
    maxRent: 14000,
  });

  const listingFields = {
    visibility: LISTING_VISIBILITIES.PUBLIC,
    isForeignerAccepted: true,
    isTM30Provided: false,
    rent: 14000,
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
        publicId: "listing/fetch-photo",
        secureUrl: "https://example.com/photo.jpg",
      },
    ],
    description: "Fetch test room",
    listedBy: user._id,
    buildingId: building._id,
  };

  if (!omitAvailableAt) {
    listingFields.availableAt = availableAt;
  }

  const listing = await Listing.create(listingFields);

  if (omitAvailableAt) {
    await Listing.collection.updateOne(
      { _id: listing._id },
      { $unset: { availableAt: "" } },
    );
  }

  return {
    building,
    listing,
    token: signAccessToken(user),
    user,
  };
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

  process.env.MONGODB_URI = replSet.getUri("listing_available_at_fetch_test");

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
    savedListingModule,
    userModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../shared/auth/index.js"),
    import("../modules/agent/agent-profile.model.js"),
    import("../modules/building/building.model.js"),
    import("../modules/listing/listing.model.js"),
    import("../modules/saved-listing/saved-listing.model.js"),
    import("../modules/user/user.model.js"),
  ]);

  signAccessToken = authModule.signAccessToken;
  AgentProfile = agentProfileModule.default;
  Building = buildingModule.default;
  Listing = listingModule.default;
  SavedListing = savedListingModule.default;
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

describe("listing availableAt fetch responses", () => {
  test("GET /listings/:id returns availableAt for the owner", async () => {
    const { listing, token } = await createPublicListingFixture();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );

    assert.equal(response.status, 200);
    assertAvailableAt(
      response.body.data.listing.availableAt,
      augustFifteenthBangkok,
    );
  });

  test("GET /listings returns availableAt in the owner list", async () => {
    const { token } = await createPublicListingFixture({
      availableAt: null,
    });

    const response = await request("/api/v1/listings", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assertAvailableAt(response.body.data.listings[0].availableAt, null);
  });

  test("GET /search/listings/:id returns availableAt publicly", async () => {
    const { listing } = await createPublicListingFixture();

    const response = await request(
      `/api/v1/search/listings/${listing._id.toString()}`,
    );

    assert.equal(response.status, 200);
    assertAvailableAt(
      response.body.data.listing.availableAt,
      augustFifteenthBangkok,
    );
  });

  test("POST /search/buildings/:id/listings returns availableAt", async () => {
    const { building } = await createPublicListingFixture();

    const response = await request(
      `/api/v1/search/buildings/${building._id.toString()}/listings`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assertAvailableAt(
      response.body.data.listings[0].availableAt,
      augustFifteenthBangkok,
    );
  });

  test("GET /saved-listings returns availableAt on nested listing", async () => {
    const { listing, token, user } = await createPublicListingFixture();

    await SavedListing.create({
      userId: user._id,
      listingId: listing._id,
      buildingId: listing.buildingId,
      listedBy: listing.listedBy,
      snapshot: {
        rent: listing.rent,
        visibility: listing.visibility,
        buildingName: "Fetch Test Building",
        coverPhoto: null,
      },
    });

    const response = await request("/api/v1/saved-listings", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.savedListings.length, 1);
    assertAvailableAt(
      response.body.data.savedListings[0].listing.availableAt,
      augustFifteenthBangkok,
    );
  });

  test("serializer returns null when availableAt is missing in the database", async () => {
    const { listing, token } = await createPublicListingFixture({
      omitAvailableAt: true,
    });

    const raw = await Listing.collection.findOne({ _id: listing._id });
    assert.equal(Object.hasOwn(raw, "availableAt"), false);

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );

    assert.equal(response.status, 200);
    assertAvailableAt(response.body.data.listing.availableAt, null);
  });
});
