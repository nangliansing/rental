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

let Building;
let Listing;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const juneTenthBangkok = startOfCalendarDayInTimeZone("2026-06-10");
const augustFifteenthBangkok = startOfCalendarDayInTimeZone("2026-08-15");

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const createOwnerWithListing = async ({
  availableAt = juneTenthBangkok,
  rent = 14000,
} = {}) => {
  const user = await User.create({
    name: "Listing Owner",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  const building = await Building.create({
    name: "Test Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
  });

  const listing = await Listing.create({
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
        publicId: "listing/test-photo",
        secureUrl: "https://example.com/photo.jpg",
      },
    ],
    description: "Test room",
    availableAt,
    listedBy: user._id,
    buildingId: building._id,
  });

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

  process.env.MONGODB_URI = replSet.getUri("owner_update_available_at_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, buildingModule, listingModule, userModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/building/building.model.js"),
      import("../modules/listing/listing.model.js"),
      import("../modules/user/user.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
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

describe("PATCH /api/v1/listings/:listingId availableAt write", () => {
  test("leaves availableAt unchanged when the field is omitted", async () => {
    const { listing, token } = await createOwnerWithListing();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ rent: 15000 }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(
      new Date(response.body.data.availableAt).getTime(),
      juneTenthBangkok.getTime(),
    );

    const saved = await Listing.findById(listing._id).lean();
    assert.equal(saved.availableAt.getTime(), juneTenthBangkok.getTime());
    assert.equal(saved.rent, 15000);
  });

  test("sets flexible when availableAt is explicitly null", async () => {
    const { listing, token } = await createOwnerWithListing();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ availableAt: null }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.availableAt, null);

    const saved = await Listing.findById(listing._id).lean();
    assert.equal(saved.availableAt, null);
  });

  test("updates availableAt when a valid date is sent", async () => {
    const { listing, token } = await createOwnerWithListing();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ availableAt: "2026-08-15" }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(
      new Date(response.body.data.availableAt).getTime(),
      augustFifteenthBangkok.getTime(),
    );

    const saved = await Listing.findById(listing._id).lean();
    assert.equal(saved.availableAt.getTime(), augustFifteenthBangkok.getTime());
  });

  test("returns 422 when availableAt is invalid", async () => {
    const { listing, token } = await createOwnerWithListing();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ availableAt: "" }),
      },
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "VALIDATION_ERROR");

    const saved = await Listing.findById(listing._id).lean();
    assert.equal(saved.availableAt.getTime(), juneTenthBangkok.getTime());
  });

  test("returns 422 when availableAt is unchanged", async () => {
    const { listing, token } = await createOwnerWithListing();

    const response = await request(
      `/api/v1/listings/${listing._id.toString()}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ availableAt: "2026-06-10" }),
      },
    );

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "NO_VALID_CHANGE");
  });
});
