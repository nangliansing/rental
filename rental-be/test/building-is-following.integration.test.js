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
let BuildingFollow;
let Listing;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const buildingPath = (buildingId) =>
  `/api/v1/buildings/${buildingId.toString()}`;

const followPath = (buildingId) =>
  `/api/v1/building-follows/${buildingId.toString()}`;

const listingsInBuildingPath = (buildingId) =>
  `/api/v1/search/buildings/${buildingId.toString()}/listings`;

const mapSearchPath = "/api/v1/search/buildings/map";
const nearbySearchPath = "/api/v1/search/buildings/nearby";
const nearLinesSearchPath = "/api/v1/search/buildings/near-lines";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, status: response.status };
};

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const assertIsFollowing = (value, expected) => {
  assert.equal(typeof value, "boolean");
  assert.equal(value, expected);
};

const createUser = async ({
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: "Follow Viewer",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const createBuilding = async (overrides = {}) =>
  Building.create({
    name: "Follow State Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: new mongoose.Types.ObjectId(),
    isActive: true,
    minRent: 12000,
    maxRent: 15000,
    ...overrides,
  });

const createPublicListing = async (building, lister) => {
  await AgentProfile.create({
    userId: lister._id,
    displayName: "Listing Agent",
    supportLanguages: ["English"],
  });

  return Listing.create({
    visibility: LISTING_VISIBILITIES.PUBLIC,
    isForeignerAccepted: true,
    isTM30Provided: true,
    rent: 14000,
    deposit: 14000,
    moveInCost: 28000,
    bedroomCount: 1,
    bathroomCount: 1,
    kitchenType: "Kitchen",
    contractMonths: 6,
    occupancy: 2,
    isCookingAllowed: true,
    isPetAllowed: false,
    facilities: ["Air Conditioner"],
    listedBy: lister._id,
    buildingId: building._id,
  });
};

const followBuilding = async ({ userId, buildingId }) =>
  BuildingFollow.create({
    userId,
    buildingId,
  });

const followBuildingViaApi = ({ token, buildingId }) =>
  request(followPath(buildingId), {
    method: "POST",
    headers: bearerHeaders(token),
  });

const unfollowBuildingViaApi = ({ token, buildingId }) =>
  request(followPath(buildingId), {
    method: "DELETE",
    headers: bearerHeaders(token),
  });

const searchMap = (body, token = null) =>
  request(mapSearchPath, {
    method: "POST",
    headers: token ? bearerHeaders(token) : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const getIsFollowingByBuildingId = (buildings, buildingId) => {
  const match = buildings.find((item) => item._id === buildingId.toString());
  assert.ok(match, `Expected building ${buildingId.toString()} in search results`);
  return match.isFollowing;
};

const mapSearchBody = {
  bounds: {
    northEast: { lat: 14, lng: 101 },
    southWest: { lat: 13, lng: 100 },
  },
  includeBuildingsWithoutMatchingListings: true,
  page: 1,
  limit: 20,
};

const nearbySearchBody = {
  position: { lat: 13.75, lng: 100.501 },
  includeBuildingsWithoutMatchingListings: true,
  limit: 20,
};

const nearLinesSearchBody = {
  geometry: {
    type: "LineString",
    coordinates: [
      [100.5, 13.75],
      [100.51, 13.75],
    ],
  },
  distanceMeters: 500,
  includeBuildingsWithoutMatchingListings: true,
  page: 1,
  limit: 20,
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

  process.env.MONGODB_URI = replSet.getUri("building_is_following_test");

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
    buildingFollowModule,
    buildingModule,
    listingModule,
    userModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../shared/auth/index.js"),
    import("../modules/agent/agent-profile.model.js"),
    import("../modules/building-follow/building-follow.model.js"),
    import("../modules/building/building.model.js"),
    import("../modules/listing/listing.model.js"),
    import("../modules/user/user.model.js"),
  ]);

  signAccessToken = authModule.signAccessToken;
  AgentProfile = agentProfileModule.default;
  BuildingFollow = buildingFollowModule.default;
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

describe("building isFollowing — shared viewer behavior", () => {
  test("returns false for anonymous, invalid, and inactive viewers", async () => {
    const building = await createBuilding();
    const [suspended, inactive] = await Promise.all([
      createUser({ status: USER_STATUSES.SUSPENDED }),
      createUser({ status: USER_STATUSES.INACTIVE }),
    ]);

    const [anonymous, invalidToken, suspendedViewer, inactiveViewer] =
      await Promise.all([
      request(buildingPath(building._id)),
      request(buildingPath(building._id), {
        headers: bearerHeaders("not-a-valid-token"),
      }),
      request(buildingPath(building._id), {
        headers: bearerHeaders(suspended.token),
      }),
      request(buildingPath(building._id), {
        headers: bearerHeaders(inactive.token),
      }),
    ]);

    assert.equal(anonymous.status, 200);
    assert.equal(invalidToken.status, 200);
    assert.equal(suspendedViewer.status, 200);
    assert.equal(inactiveViewer.status, 200);
    assertIsFollowing(anonymous.body.data.isFollowing, false);
    assertIsFollowing(invalidToken.body.data.isFollowing, false);
    assertIsFollowing(suspendedViewer.body.data.isFollowing, false);
    assertIsFollowing(inactiveViewer.body.data.isFollowing, false);
  });

  test("returns false when the token belongs to a deleted user", async () => {
    const building = await createBuilding();
    const deletedUser = await createUser();
    const token = deletedUser.token;

    await User.deleteOne({ _id: deletedUser.user._id });

    const response = await request(buildingPath(building._id), {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 200);
    assertIsFollowing(response.body.data.isFollowing, false);
  });

  test("returns true only for an active viewer who follows the building", async () => {
    const building = await createBuilding();
    const follower = await createUser();
    const other = await createUser();

    await followBuilding({
      userId: follower.user._id,
      buildingId: building._id,
    });

    const [followerResponse, otherResponse] = await Promise.all([
      request(buildingPath(building._id), {
        headers: bearerHeaders(follower.token),
      }),
      request(buildingPath(building._id), {
        headers: bearerHeaders(other.token),
      }),
    ]);

    assert.equal(followerResponse.status, 200);
    assert.equal(otherResponse.status, 200);
    assertIsFollowing(followerResponse.body.data.isFollowing, true);
    assertIsFollowing(otherResponse.body.data.isFollowing, false);
  });

  test("reflects follow and unfollow lifecycle changes", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    const beforeFollow = await request(buildingPath(building._id), {
      headers: bearerHeaders(viewer.token),
    });
    assertIsFollowing(beforeFollow.body.data.isFollowing, false);

    const followResponse = await followBuildingViaApi({
      token: viewer.token,
      buildingId: building._id,
    });
    assert.equal(followResponse.status, 201);

    const afterFollow = await request(buildingPath(building._id), {
      headers: bearerHeaders(viewer.token),
    });
    assertIsFollowing(afterFollow.body.data.isFollowing, true);

    const unfollowResponse = await unfollowBuildingViaApi({
      token: viewer.token,
      buildingId: building._id,
    });
    assert.equal(unfollowResponse.status, 200);

    const afterUnfollow = await request(buildingPath(building._id), {
      headers: bearerHeaders(viewer.token),
    });
    assertIsFollowing(afterUnfollow.body.data.isFollowing, false);
  });

  test("does not treat another user's follow as the viewer's follow", async () => {
    const building = await createBuilding();
    const follower = await createUser();
    const viewer = await createUser();

    await followBuilding({
      userId: follower.user._id,
      buildingId: building._id,
    });

    const response = await request(buildingPath(building._id), {
      headers: bearerHeaders(viewer.token),
    });

    assert.equal(response.status, 200);
    assertIsFollowing(response.body.data.isFollowing, false);
  });
});

describe("GET /api/v1/buildings/:buildingId", () => {
  test("includes isFollowing on the building payload", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const response = await request(buildingPath(building._id), {
      headers: bearerHeaders(viewer.token),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data._id, building._id.toString());
    assertIsFollowing(response.body.data.isFollowing, true);
  });

  test("returns 404 for missing or inactive buildings before isFollowing is relevant", async () => {
    const inactiveBuilding = await createBuilding({ isActive: false });
    const missingBuildingId = new mongoose.Types.ObjectId();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: inactiveBuilding._id,
    });

    const [inactiveResponse, missingResponse] = await Promise.all([
      request(buildingPath(inactiveBuilding._id), {
        headers: bearerHeaders(viewer.token),
      }),
      request(buildingPath(missingBuildingId), {
        headers: bearerHeaders(viewer.token),
      }),
    ]);

    assert.equal(inactiveResponse.status, 404);
    assert.equal(inactiveResponse.body.code, "BUILDING_NOT_FOUND");
    assert.equal(missingResponse.status, 404);
    assert.equal(missingResponse.body.code, "BUILDING_NOT_FOUND");
  });

  test("returns 422 for an invalid building id", async () => {
    const response = await request(buildingPath("not-a-valid-id"));

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });
});

describe("POST /api/v1/search/buildings/map", () => {
  test("includes isFollowing on each returned building", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const [anonymous, authenticated] = await Promise.all([
      searchMap(mapSearchBody),
      searchMap(mapSearchBody, viewer.token),
    ]);

    assert.equal(anonymous.status, 200);
    assert.equal(authenticated.status, 200);
    assert.equal(anonymous.body.data.length, 1);
    assertIsFollowing(anonymous.body.data[0].isFollowing, false);
    assertIsFollowing(authenticated.body.data[0].isFollowing, true);
  });

  test("returns mixed isFollowing values for multiple buildings", async () => {
    const viewer = await createUser();
    const [followedBuilding, otherBuilding] = await Promise.all([
      createBuilding({ name: "Followed Building" }),
      createBuilding({
        name: "Other Building",
        location: { type: "Point", coordinates: [100.502, 13.751] },
      }),
    ]);

    await followBuilding({
      userId: viewer.user._id,
      buildingId: followedBuilding._id,
    });

    const response = await searchMap(mapSearchBody, viewer.token);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 2);
    assert.equal(
      getIsFollowingByBuildingId(response.body.data, followedBuilding._id),
      true,
    );
    assert.equal(
      getIsFollowingByBuildingId(response.body.data, otherBuilding._id),
      false,
    );
  });

  test("calculates isFollowing only for the paginated page", async () => {
    const viewer = await createUser();
    const lister = await createUser();
    const [firstPageBuilding, secondPageBuilding] = await Promise.all([
      createBuilding({
        name: "First Page Building",
        location: { type: "Point", coordinates: [100.501, 13.75] },
      }),
      createBuilding({
        name: "Second Page Building",
        location: { type: "Point", coordinates: [100.502, 13.751] },
      }),
    ]);

    await Promise.all([
      followBuilding({
        userId: viewer.user._id,
        buildingId: secondPageBuilding._id,
      }),
      createPublicListing(firstPageBuilding, lister.user),
    ]);

    const [pageOne, pageTwo] = await Promise.all([
      searchMap({ ...mapSearchBody, page: 1, limit: 1 }, viewer.token),
      searchMap({ ...mapSearchBody, page: 2, limit: 1 }, viewer.token),
    ]);

    assert.equal(pageOne.status, 200);
    assert.equal(pageTwo.status, 200);
    assert.equal(pageOne.body.data.length, 1);
    assert.equal(pageTwo.body.data.length, 1);
    assert.equal(pageOne.body.pagination.total, 2);
    assert.equal(pageTwo.body.pagination.total, 2);

    const pageOneBuildingId = pageOne.body.data[0]._id;
    const pageTwoBuildingId = pageTwo.body.data[0]._id;

    assert.notEqual(pageOneBuildingId, pageTwoBuildingId);
    assertIsFollowing(pageOne.body.data[0].isFollowing, pageOneBuildingId === secondPageBuilding._id.toString());
    assertIsFollowing(pageTwo.body.data[0].isFollowing, pageTwoBuildingId === secondPageBuilding._id.toString());
  });
});

describe("POST /api/v1/search/buildings/nearby", () => {
  test("includes isFollowing on each returned building", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const response = await request(nearbySearchPath, {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify(nearbySearchBody),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assertIsFollowing(response.body.data[0].isFollowing, true);
  });

  test("returns mixed isFollowing values for multiple nearby buildings", async () => {
    const viewer = await createUser();
    const [followedBuilding, otherBuilding] = await Promise.all([
      createBuilding({ name: "Nearby Followed" }),
      createBuilding({
        name: "Nearby Other",
        location: { type: "Point", coordinates: [100.5015, 13.7505] },
      }),
    ]);

    await followBuilding({
      userId: viewer.user._id,
      buildingId: followedBuilding._id,
    });

    const response = await request(nearbySearchPath, {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify(nearbySearchBody),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 2);
    assert.equal(
      getIsFollowingByBuildingId(response.body.data, followedBuilding._id),
      true,
    );
    assert.equal(
      getIsFollowingByBuildingId(response.body.data, otherBuilding._id),
      false,
    );
  });
});

describe("POST /api/v1/search/buildings/near-lines", () => {
  test("includes isFollowing on each returned building", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const response = await request(nearLinesSearchPath, {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify(nearLinesSearchBody),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assertIsFollowing(response.body.data[0].isFollowing, true);
  });

  test("returns false for anonymous viewers even when follows exist", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const response = await request(nearLinesSearchPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nearLinesSearchBody),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assertIsFollowing(response.body.data[0].isFollowing, false);
  });
});

describe("POST /api/v1/search/buildings/:buildingId/listings", () => {
  test("includes isFollowing on the building header only", async () => {
    const lister = await createUser();
    const viewer = await createUser();
    const building = await createBuilding();

    await Promise.all([
      followBuilding({
        userId: viewer.user._id,
        buildingId: building._id,
      }),
      createPublicListing(building, viewer.user),
      createPublicListing(building, lister.user),
    ]);

    const response = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify({ page: 1, limit: 20 }),
    });

    assert.equal(response.status, 200);
    assertIsFollowing(response.body.data.building.isFollowing, true);
    assert.equal(response.body.data.listings.length, 2);
    assert.ok(
      response.body.data.listings.every(
        (listing) => Object.hasOwn(listing, "isFollowing") === false,
      ),
    );
  });

  test("returns isFollowing false when the viewer has not followed the building", async () => {
    const lister = await createUser();
    const viewer = await createUser();
    const building = await createBuilding();

    await createPublicListing(building, lister.user);

    const response = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify({ page: 1, limit: 20 }),
    });

    assert.equal(response.status, 200);
    assertIsFollowing(response.body.data.building.isFollowing, false);
  });

  test("returns isFollowing false for anonymous viewers", async () => {
    const lister = await createUser();
    const viewer = await createUser();
    const building = await createBuilding();

    await Promise.all([
      followBuilding({
        userId: viewer.user._id,
        buildingId: building._id,
      }),
      createPublicListing(building, lister.user),
    ]);

    const response = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page: 1, limit: 20 }),
    });

    assert.equal(response.status, 200);
    assertIsFollowing(response.body.data.building.isFollowing, false);
  });

  test("updates isFollowing after follow and unfollow via the follow API", async () => {
    const lister = await createUser();
    const viewer = await createUser();
    const building = await createBuilding();

    await createPublicListing(building, lister.user);

    const beforeFollow = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify({ page: 1, limit: 20 }),
    });
    assertIsFollowing(beforeFollow.body.data.building.isFollowing, false);

    assert.equal(
      (await followBuildingViaApi({ token: viewer.token, buildingId: building._id }))
        .status,
      201,
    );

    const afterFollow = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify({ page: 1, limit: 20 }),
    });
    assertIsFollowing(afterFollow.body.data.building.isFollowing, true);

    assert.equal(
      (await unfollowBuildingViaApi({ token: viewer.token, buildingId: building._id }))
        .status,
      200,
    );

    const afterUnfollow = await request(listingsInBuildingPath(building._id), {
      method: "POST",
      headers: bearerHeaders(viewer.token),
      body: JSON.stringify({ page: 1, limit: 20 }),
    });
    assertIsFollowing(afterUnfollow.body.data.building.isFollowing, false);
  });
});

describe("GET /api/v1/buildings/:buildingId/neighbourhood", () => {
  test("does not expose building isFollowing on the neighbourhood payload", async () => {
    const building = await createBuilding();
    const viewer = await createUser();

    await followBuilding({
      userId: viewer.user._id,
      buildingId: building._id,
    });

    const response = await request(
      `${buildingPath(building._id)}/neighbourhood?radiusM=1500&fetchRadiusM=2000`,
      {
        headers: bearerHeaders(viewer.token),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.buildingId, building._id.toString());
    assert.equal(Object.hasOwn(response.body.data, "isFollowing"), false);
  });
});
