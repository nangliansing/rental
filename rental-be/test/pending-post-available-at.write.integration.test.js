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

let AgentProfile;
let Building;
let PendingPost;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const buildListingPayload = (options = {}) => {
  const listing = {
    visibility: "PUBLIC",
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
        publicId: "listing/test-photo",
        secureUrl: "https://example.com/photo.jpg",
      },
    ],
    description: "Test room",
  };

  if (Object.hasOwn(options, "availableAt")) {
    listing.availableAt = options.availableAt;
  }

  return listing;
};

const createAgentWithBuilding = async () => {
  const user = await User.create({
    name: "Pending Post Agent",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
  });

  await AgentProfile.create({
    userId: user._id,
    displayName: "Test Agent",
    supportLanguages: ["English"],
  });

  const building = await Building.create({
    name: "Test Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: user._id,
    isActive: true,
  });

  return {
    building,
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

  process.env.MONGODB_URI = replSet.getUri("pending_post_available_at_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, agentProfileModule, buildingModule, pendingPostModule, userModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/agent/agent-profile.model.js"),
      import("../modules/building/building.model.js"),
      import("../modules/pending-post/pending-post.model.js"),
      import("../modules/user/user.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  AgentProfile = agentProfileModule.default;
  Building = buildingModule.default;
  PendingPost = pendingPostModule.default;
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

describe("POST /api/v1/pending-posts availableAt write", () => {
  test("stores null when availableAt is omitted (flexible default)", async () => {
    const { building, token } = await createAgentWithBuilding();

    const response = await request("/api/v1/pending-posts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        existingBuildingId: building._id.toString(),
        listing: buildListingPayload(),
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.listing.availableAt, null);

    const saved = await PendingPost.findById(response.body.data._id).lean();
    assert.equal(saved.listing.availableAt, null);
  });

  test("stores null when availableAt is explicitly null", async () => {
    const { building, token } = await createAgentWithBuilding();

    const response = await request("/api/v1/pending-posts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        existingBuildingId: building._id.toString(),
        listing: buildListingPayload({ availableAt: null }),
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.listing.availableAt, null);
  });

  test("stores a normalized Bangkok date when availableAt is provided", async () => {
    const { building, token } = await createAgentWithBuilding();
    const expected = startOfCalendarDayInTimeZone("2026-08-15");

    const response = await request("/api/v1/pending-posts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        existingBuildingId: building._id.toString(),
        listing: buildListingPayload({ availableAt: "2026-08-15" }),
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(
      new Date(response.body.data.listing.availableAt).getTime(),
      expected.getTime(),
    );

    const saved = await PendingPost.findById(response.body.data._id).lean();
    assert.equal(saved.listing.availableAt.getTime(), expected.getTime());
  });

  test("returns 422 when availableAt is invalid", async () => {
    const { building, token } = await createAgentWithBuilding();

    const response = await request("/api/v1/pending-posts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        existingBuildingId: building._id.toString(),
        listing: buildListingPayload({ availableAt: "" }),
      }),
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(await PendingPost.countDocuments(), 0);
  });
});
