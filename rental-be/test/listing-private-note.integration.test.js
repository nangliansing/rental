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
import { USER_STATUSES } from "../modules/user/user.constants.js";
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
const PRIVATE_NOTE = "Call the owner before viewing";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const assertPrivateNoteAbsent = (listing) => {
  assert.equal(Object.hasOwn(listing, "privateNote"), false);
};

const createListingFixture = async ({
  visibility = LISTING_VISIBILITIES.PUBLIC,
  privateNote = PRIVATE_NOTE,
  ownerStatus = USER_STATUSES.ACTIVE,
} = {}) => {
  const owner = await User.create({
    name: "Listing Owner",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    status: ownerStatus,
  });

  const viewer = await User.create({
    name: "Other Viewer",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  await AgentProfile.create({
    userId: owner._id,
    displayName: "Private Note Agent",
    supportLanguages: ["English"],
  });

  const building = await Building.create({
    name: "Private Note Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: owner._id,
    isActive: true,
    minRent: 14000,
    maxRent: 14000,
  });

  const listing = await Listing.create({
    visibility,
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
        publicId: "listing/private-note-photo",
        secureUrl: "https://example.com/photo.jpg",
      },
    ],
    description: "Private note test room",
    availableAt: augustFifteenthBangkok,
    privateNote,
    listedBy: owner._id,
    buildingId: building._id,
  });

  return {
    building,
    listing,
    owner,
    ownerToken: signAccessToken(owner),
    viewerToken: signAccessToken(viewer),
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

  process.env.MONGODB_URI = replSet.getUri("listing_private_note_test");

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

describe("privateNote listing detail reads", () => {
  test("GET /search/listings/:id hides privateNote for anonymous viewers", async () => {
    const { listing } = await createListingFixture();

    const response = await request(
      `/api/v1/search/listings/${listing._id.toString()}`,
    );

    assert.equal(response.status, 200);
    assertPrivateNoteAbsent(response.body.data.listing);
  });

  test("GET /search/listings/:id hides privateNote for authenticated non-owners", async () => {
    const { listing, viewerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/search/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${viewerToken}` },
      },
    );

    assert.equal(response.status, 200);
    assertPrivateNoteAbsent(response.body.data.listing);
  });

  test("GET /search/listings/:id returns privateNote for the active owner", async () => {
    const { listing, ownerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/search/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${ownerToken}` },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listing.privateNote, PRIVATE_NOTE);
  });

  test("GET /listings/:id rejects inactive owners before exposing privateNote", async () => {
    const { listing, ownerToken } = await createListingFixture({
      ownerStatus: USER_STATUSES.INACTIVE,
    });

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${ownerToken}` },
      },
    );

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "ACCOUNT_INACTIVE");
  });

  test("GET /listings/:id returns privateNote for the owner detail endpoint", async () => {
    const { listing, ownerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${ownerToken}` },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listing.privateNote, PRIVATE_NOTE);
  });

  test("GET /listings/:id returns privateNote for private listings owned by the caller", async () => {
    const { listing, ownerToken } = await createListingFixture({
      visibility: LISTING_VISIBILITIES.PRIVATE,
    });

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        headers: { authorization: `Bearer ${ownerToken}` },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listing.privateNote, PRIVATE_NOTE);
  });
});

describe("privateNote non-detail reads stay redacted", () => {
  test("GET /listings hides privateNote in the owner list", async () => {
    const { ownerToken } = await createListingFixture();

    const response = await request("/api/v1/listings", {
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.listings.length, 1);
    assertPrivateNoteAbsent(response.body.data.listings[0]);
  });

  test("POST /search/buildings/:id/listings hides privateNote in building results", async () => {
    const { building } = await createListingFixture();

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
    assertPrivateNoteAbsent(response.body.data.listings[0]);
  });

  test("GET /saved-listings hides privateNote on nested listing payloads", async () => {
    const { listing, owner, ownerToken } = await createListingFixture();

    await SavedListing.create({
      userId: owner._id,
      listingId: listing._id,
      buildingId: listing.buildingId,
      listedBy: listing.listedBy,
      snapshot: {
        rent: listing.rent,
        visibility: listing.visibility,
        buildingName: "Private Note Building",
        coverPhoto: null,
      },
    });

    const response = await request("/api/v1/saved-listings", {
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.savedListings.length, 1);
    assertPrivateNoteAbsent(response.body.data.savedListings[0].listing);
  });
});

describe("privateNote owner writes", () => {
  test("PATCH /listings/:id persists privateNote but redacts it from the response", async () => {
    const { listing, ownerToken } = await createListingFixture({
      privateNote: null,
    });

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${ownerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ privateNote: "  New owner-only note  " }),
      },
    );

    assert.equal(response.status, 200);
    assertPrivateNoteAbsent(response.body.data);

    const saved = await Listing.findById(listing._id).select("+privateNote").lean();
    assert.equal(saved.privateNote, "New owner-only note");
  });

  test("PATCH /listings/:id clears privateNote when explicitly null", async () => {
    const { listing, ownerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${ownerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ privateNote: null }),
      },
    );

    assert.equal(response.status, 200);
    assertPrivateNoteAbsent(response.body.data);

    const saved = await Listing.findById(listing._id).select("+privateNote").lean();
    assert.equal(saved.privateNote, null);
  });

  test("PATCH /listings/:id returns 422 for invalid privateNote values", async () => {
    const { listing, ownerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${ownerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ privateNote: 123 }),
      },
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");

    const saved = await Listing.findById(listing._id).select("+privateNote").lean();
    assert.equal(saved.privateNote, PRIVATE_NOTE);
  });

  test("PATCH /listings/:id returns 422 when privateNote is unchanged", async () => {
    const { listing, ownerToken } = await createListingFixture();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${ownerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ privateNote: PRIVATE_NOTE }),
      },
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "NO_VALID_CHANGE");
  });
});
