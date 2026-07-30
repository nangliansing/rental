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

let AgentProfile;
let Building;
let BuildingFollow;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const buildingFollowersPath = (buildingId) =>
  `/api/v1/building-follows/buildings/${buildingId.toString()}`;

const userFollowingsPath = (userId) =>
  `/api/v1/building-follows/users/${userId.toString()}`;

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

const assertFollowRecordShape = (record) => {
  assert.equal(typeof record._id, "string");
  assert.equal(typeof record.userId, "string");
  assert.equal(typeof record.buildingId, "string");
  assert.equal(typeof record.createdAt, "string");
  assert.equal(typeof record.updatedAt, "string");
};

const followerIds = (response) =>
  response.body.data.followers.map((follower) => follower._id);

const followingIds = (response) =>
  response.body.data.followings.map((following) => following._id);

const createFollow = async ({
  userId,
  buildingId,
  createdAt,
}) => {
  const follow = await BuildingFollow.create({
    userId,
    buildingId,
  });

  if (createdAt) {
    await BuildingFollow.updateOne(
      { _id: follow._id },
      { $set: { createdAt, updatedAt: createdAt } },
    );
  }

  return follow;
};

const createUser = async ({
  status = USER_STATUSES.ACTIVE,
  withProfile = false,
} = {}) => {
  const user = await User.create({
    name: "Follow Fetch User",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    status,
  });

  if (withProfile) {
    await AgentProfile.create({
      userId: user._id,
      displayName: "Fetch Agent",
      supportLanguages: ["English"],
    });
  }

  return {
    token: signAccessToken(user),
    user,
  };
};

const createBuilding = async ({
  isActive = true,
  name = "Fetch Test Building",
} = {}) => {
  return Building.create({
    name,
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy: new mongoose.Types.ObjectId(),
    isActive,
    minRent: 12000,
    maxRent: 15000,
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

  process.env.MONGODB_URI = replSet.getUri("building_follow_fetch_test");

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
    userModule,
  ] = await Promise.all([
    import("../app.js"),
    import("../shared/auth/index.js"),
    import("../modules/agent/agent-profile.model.js"),
    import("../modules/building-follow/building-follow.model.js"),
    import("../modules/building/building.model.js"),
    import("../modules/user/user.model.js"),
  ]);

  signAccessToken = authModule.signAccessToken;
  AgentProfile = agentProfileModule.default;
  BuildingFollow = buildingFollowModule.default;
  Building = buildingModule.default;
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

describe("GET /api/v1/building-follows/buildings/:buildingId", () => {
  test("returns a stable response contract", async () => {
    const building = await createBuilding();
    const follower = await createUser({ withProfile: true });

    await createFollow({
      userId: follower.user._id,
      buildingId: building._id,
    });

    const response = await request(buildingFollowersPath(building._id));

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(Array.isArray(response.body.data.followers), true);
    assert.equal(typeof response.body.pagination.page, "number");
    assert.equal(typeof response.body.pagination.limit, "number");
    assert.equal(typeof response.body.pagination.total, "number");

    const record = response.body.data.followers[0];
    assertFollowRecordShape(record);
    assert.equal(record.user.displayName, "Fetch Agent");
    assert.equal(record.building, undefined);
  });

  test("returns paginated followers with populated active users", async () => {
    const building = await createBuilding();
    const activeFollower = await createUser({ withProfile: true });
    const secondFollower = await createUser();

    await BuildingFollow.create([
      {
        userId: activeFollower.user._id,
        buildingId: building._id,
      },
      {
        userId: secondFollower.user._id,
        buildingId: building._id,
      },
    ]);

    const [pageOneResponse, fullResponse] = await Promise.all([
      request(`${buildingFollowersPath(building._id)}?page=1&limit=1`),
      request(`${buildingFollowersPath(building._id)}?page=1&limit=10`),
    ]);

    assert.equal(pageOneResponse.status, 200);
    assert.equal(pageOneResponse.body.success, true);
    assert.equal(pageOneResponse.body.data.followers.length, 1);
    assert.equal(pageOneResponse.body.pagination.page, 1);
    assert.equal(pageOneResponse.body.pagination.limit, 1);
    assert.equal(pageOneResponse.body.pagination.total, 2);

    const populatedFollower = fullResponse.body.data.followers.find(
      (follower) => follower.user?.displayName === "Fetch Agent",
    );

    assert.ok(populatedFollower);
    assert.equal(typeof populatedFollower._id, "string");
    assert.equal(populatedFollower.buildingId, building._id.toString());
    assert.equal(typeof populatedFollower.user._id, "string");
  });

  test("returns null user for inactive followers", async () => {
    const building = await createBuilding();
    const inactiveFollower = await createUser({
      status: USER_STATUSES.SUSPENDED,
    });

    await BuildingFollow.create({
      userId: inactiveFollower.user._id,
      buildingId: building._id,
    });

    const response = await request(buildingFollowersPath(building._id));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.followers.length, 1);
    assert.equal(response.body.data.followers[0].user, null);
    assert.equal(response.body.pagination.total, 1);
  });

  test("works without authentication", async () => {
    const building = await createBuilding();

    const response = await request(buildingFollowersPath(building._id));

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.followers, []);
    assert.equal(response.body.pagination.total, 0);
  });

  test("returns 404 when the building is inactive or missing", async () => {
    const inactiveBuilding = await createBuilding({ isActive: false });
    const missingBuildingId = new mongoose.Types.ObjectId();

    const [inactiveResponse, missingResponse] = await Promise.all([
      request(buildingFollowersPath(inactiveBuilding._id)),
      request(buildingFollowersPath(missingBuildingId)),
    ]);

    assert.equal(inactiveResponse.status, 404);
    assert.equal(inactiveResponse.body.code, "BUILDING_NOT_FOUND");
    assert.equal(missingResponse.status, 404);
    assert.equal(missingResponse.body.code, "BUILDING_NOT_FOUND");
  });

  test("returns 422 for an invalid building id", async () => {
    const response = await request(buildingFollowersPath("not-a-valid-id"));

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assertRequestId(response);
  });

  describe("pagination", () => {
    test("uses default pagination when query params are omitted", async () => {
      const building = await createBuilding();
      const followers = await Promise.all([
        createUser(),
        createUser(),
        createUser(),
      ]);

      await Promise.all(
        followers.map(({ user }) =>
          createFollow({ userId: user._id, buildingId: building._id }),
        ),
      );

      const response = await request(buildingFollowersPath(building._id));

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followers.length, 3);
      assert.equal(response.body.pagination.page, 1);
      assert.equal(response.body.pagination.limit, 20);
      assert.equal(response.body.pagination.total, 3);
    });

    test("supports explicit page and limit", async () => {
      const building = await createBuilding();
      const followers = await Promise.all([
        createUser(),
        createUser(),
        createUser(),
        createUser(),
        createUser(),
      ]);

      await Promise.all(
        followers.map(({ user }) =>
          createFollow({ userId: user._id, buildingId: building._id }),
        ),
      );

      const response = await request(
        `${buildingFollowersPath(building._id)}?page=1&limit=2`,
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followers.length, 2);
      assert.equal(response.body.pagination.page, 1);
      assert.equal(response.body.pagination.limit, 2);
      assert.equal(response.body.pagination.total, 5);
    });

    test("returns the next page without overlap and preserves total", async () => {
      const building = await createBuilding();
      const followers = await Promise.all([
        createUser(),
        createUser(),
        createUser(),
        createUser(),
      ]);

      await Promise.all(
        followers.map(({ user }) =>
          createFollow({ userId: user._id, buildingId: building._id }),
        ),
      );

      const [firstPage, secondPage] = await Promise.all([
        request(`${buildingFollowersPath(building._id)}?page=1&limit=2`),
        request(`${buildingFollowersPath(building._id)}?page=2&limit=2`),
      ]);

      assert.equal(firstPage.status, 200);
      assert.equal(secondPage.status, 200);
      assert.equal(firstPage.body.data.followers.length, 2);
      assert.equal(secondPage.body.data.followers.length, 2);
      assert.equal(firstPage.body.pagination.total, 4);
      assert.equal(secondPage.body.pagination.total, 4);
      assert.equal(secondPage.body.pagination.page, 2);

      const firstIds = followerIds(firstPage);
      const secondIds = followerIds(secondPage);
      assert.equal(
        firstIds.some((id) => secondIds.includes(id)),
        false,
      );
    });

    test("returns an empty page when page exceeds total results", async () => {
      const building = await createBuilding();
      const follower = await createUser();

      await createFollow({
        userId: follower.user._id,
        buildingId: building._id,
      });

      const response = await request(
        `${buildingFollowersPath(building._id)}?page=100&limit=20`,
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followers.length, 0);
      assert.equal(response.body.pagination.total, 1);
      assert.equal(response.body.pagination.page, 100);
    });

    test("rejects invalid page and limit values", async () => {
      const building = await createBuilding();

      const invalidPage = await request(
        `${buildingFollowersPath(building._id)}?page=0`,
      );
      assert.equal(invalidPage.status, 422);
      assert.match(invalidPage.body.message, /page must be between 1 and 10000/);

      const invalidLimit = await request(
        `${buildingFollowersPath(building._id)}?limit=101`,
      );
      assert.equal(invalidLimit.status, 422);
      assert.match(invalidLimit.body.message, /limit must be between 1 and 100/);
    });
  });

  describe("scoping and sorting", () => {
    test("sorts followers by newest follow first", async () => {
      const building = await createBuilding();
      const [olderFollower, newerFollower] = await Promise.all([
        createUser({ withProfile: true }),
        createUser({ withProfile: true }),
      ]);

      await createFollow({
        userId: olderFollower.user._id,
        buildingId: building._id,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      });
      await createFollow({
        userId: newerFollower.user._id,
        buildingId: building._id,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      });

      const response = await request(buildingFollowersPath(building._id));

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followers.length, 2);
      assert.equal(
        response.body.data.followers[0].userId,
        newerFollower.user._id.toString(),
      );
      assert.equal(
        response.body.data.followers[1].userId,
        olderFollower.user._id.toString(),
      );
    });

    test("scopes followers to the requested building only", async () => {
      const [targetBuilding, otherBuilding] = await Promise.all([
        createBuilding({ name: "Target Building" }),
        createBuilding({ name: "Other Building" }),
      ]);
      const [targetFollowerA, targetFollowerB, otherFollower] =
        await Promise.all([createUser(), createUser(), createUser()]);

      await BuildingFollow.create([
        {
          userId: targetFollowerA.user._id,
          buildingId: targetBuilding._id,
        },
        {
          userId: targetFollowerB.user._id,
          buildingId: targetBuilding._id,
        },
        {
          userId: otherFollower.user._id,
          buildingId: otherBuilding._id,
        },
      ]);

      const response = await request(buildingFollowersPath(targetBuilding._id));

      assert.equal(response.status, 200);
      assert.equal(response.body.pagination.total, 2);
      assert.deepEqual(
        response.body.data.followers
          .map((follower) => follower.userId)
          .sort(),
        [
          targetFollowerA.user._id.toString(),
          targetFollowerB.user._id.toString(),
        ].sort(),
      );
    });
  });

  describe("population", () => {
    test("returns mixed populated and null users in one response", async () => {
      const building = await createBuilding();
      const activeFollower = await createUser({ withProfile: true });
      const inactiveFollower = await createUser({
        status: USER_STATUSES.SUSPENDED,
      });

      await BuildingFollow.create([
        {
          userId: activeFollower.user._id,
          buildingId: building._id,
        },
        {
          userId: inactiveFollower.user._id,
          buildingId: building._id,
        },
      ]);

      const response = await request(buildingFollowersPath(building._id));

      assert.equal(response.status, 200);
      assert.equal(response.body.pagination.total, 2);

      const populated = response.body.data.followers.find(
        (follower) => follower.userId === activeFollower.user._id.toString(),
      );
      const unpopulated = response.body.data.followers.find(
        (follower) => follower.userId === inactiveFollower.user._id.toString(),
      );

      assert.equal(populated.user.displayName, "Fetch Agent");
      assert.equal(unpopulated.user, null);
    });

    test("falls back to user name when agent profile is missing", async () => {
      const building = await createBuilding();
      const follower = await createUser();

      await createFollow({
        userId: follower.user._id,
        buildingId: building._id,
      });

      const response = await request(buildingFollowersPath(building._id));

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followers[0].user.displayName, "Follow Fetch User");
    });
  });
});

describe("GET /api/v1/building-follows/users/:userId", () => {
  test("returns a stable response contract", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding();

    await createFollow({
      userId: user._id,
      buildingId: building._id,
    });

    const response = await request(userFollowingsPath(user._id), {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(Array.isArray(response.body.data.followings), true);
    assert.equal(typeof response.body.pagination.page, "number");
    assert.equal(typeof response.body.pagination.limit, "number");
    assert.equal(typeof response.body.pagination.total, "number");

    const record = response.body.data.followings[0];
    assertFollowRecordShape(record);
    assert.equal(record.building.name, "Fetch Test Building");
    assert.equal(record.user, undefined);
  });

  test("returns paginated followings with populated active buildings", async () => {
    const { token, user } = await createUser();
    const [firstBuilding, secondBuilding] = await Promise.all([
      createBuilding({ name: "First Building" }),
      createBuilding({ name: "Second Building" }),
    ]);

    await BuildingFollow.create([
      { userId: user._id, buildingId: firstBuilding._id },
      { userId: user._id, buildingId: secondBuilding._id },
    ]);

    const [pageOneResponse, fullResponse] = await Promise.all([
      request(`${userFollowingsPath(user._id)}?page=1&limit=1`, {
        headers: bearerHeaders(token),
      }),
      request(`${userFollowingsPath(user._id)}?page=1&limit=10`, {
        headers: bearerHeaders(token),
      }),
    ]);

    assert.equal(pageOneResponse.status, 200);
    assert.equal(pageOneResponse.body.data.followings.length, 1);
    assert.equal(pageOneResponse.body.pagination.total, 2);

    const buildingNames = fullResponse.body.data.followings.map(
      (following) => following.building.name,
    );

    assert.deepEqual(buildingNames.sort(), ["First Building", "Second Building"]);
  });

  test("returns null building for inactive or missing buildings", async () => {
    const { token, user } = await createUser();
    const inactiveBuilding = await createBuilding({ isActive: false });
    const deletedBuildingId = new mongoose.Types.ObjectId();

    await BuildingFollow.create([
      { userId: user._id, buildingId: inactiveBuilding._id },
      { userId: user._id, buildingId: deletedBuildingId },
    ]);

    const response = await request(userFollowingsPath(user._id), {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, 2);
    assert.equal(response.body.data.followings[0].building, null);
    assert.equal(response.body.data.followings[1].building, null);
  });

  test("requires authentication and only allows the current user", async () => {
    const owner = await createUser();
    const other = await createUser();
    const building = await createBuilding();

    await BuildingFollow.create({
      userId: owner.user._id,
      buildingId: building._id,
    });

    const [unauthenticated, forbidden] = await Promise.all([
      request(userFollowingsPath(owner.user._id)),
      request(userFollowingsPath(owner.user._id), {
        headers: bearerHeaders(other.token),
      }),
    ]);

    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.code, "ACCESS_TOKEN_REQUIRED");
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.code, "FORBIDDEN");
  });

  test("returns 403 when the requested user is inactive", async () => {
    const inactiveUser = await createUser({ status: USER_STATUSES.SUSPENDED });

    const response = await request(userFollowingsPath(inactiveUser.user._id), {
      headers: bearerHeaders(inactiveUser.token),
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "ACCOUNT_SUSPENDED");
  });

  test("returns 422 for an invalid user id", async () => {
    const { token } = await createUser();

    const response = await request(userFollowingsPath("not-a-valid-id"), {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assertRequestId(response);
  });

  test("allows the authenticated owner to read their followings", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding();

    await createFollow({
      userId: user._id,
      buildingId: building._id,
    });

    const response = await request(userFollowingsPath(user._id), {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.data.followings[0].buildingId, building._id.toString());
  });

  describe("pagination", () => {
    test("uses default pagination when query params are omitted", async () => {
      const { token, user } = await createUser();
      const buildings = await Promise.all([
        createBuilding({ name: "Building A" }),
        createBuilding({ name: "Building B" }),
        createBuilding({ name: "Building C" }),
      ]);

      await Promise.all(
        buildings.map((building) =>
          createFollow({ userId: user._id, buildingId: building._id }),
        ),
      );

      const response = await request(userFollowingsPath(user._id), {
        headers: bearerHeaders(token),
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followings.length, 3);
      assert.equal(response.body.pagination.page, 1);
      assert.equal(response.body.pagination.limit, 20);
      assert.equal(response.body.pagination.total, 3);
    });

    test("returns the next page without overlap and preserves total", async () => {
      const { token, user } = await createUser();
      const buildings = await Promise.all([
        createBuilding({ name: "Building 1" }),
        createBuilding({ name: "Building 2" }),
        createBuilding({ name: "Building 3" }),
        createBuilding({ name: "Building 4" }),
      ]);

      await Promise.all(
        buildings.map((building) =>
          createFollow({ userId: user._id, buildingId: building._id }),
        ),
      );

      const [firstPage, secondPage] = await Promise.all([
        request(`${userFollowingsPath(user._id)}?page=1&limit=2`, {
          headers: bearerHeaders(token),
        }),
        request(`${userFollowingsPath(user._id)}?page=2&limit=2`, {
          headers: bearerHeaders(token),
        }),
      ]);

      assert.equal(firstPage.body.data.followings.length, 2);
      assert.equal(secondPage.body.data.followings.length, 2);
      assert.equal(firstPage.body.pagination.total, 4);
      assert.equal(secondPage.body.pagination.total, 4);

      const firstIds = followingIds(firstPage);
      const secondIds = followingIds(secondPage);
      assert.equal(
        firstIds.some((id) => secondIds.includes(id)),
        false,
      );
    });

    test("returns an empty page when page exceeds total results", async () => {
      const { token, user } = await createUser();
      const building = await createBuilding();

      await createFollow({
        userId: user._id,
        buildingId: building._id,
      });

      const response = await request(
        `${userFollowingsPath(user._id)}?page=100&limit=20`,
        {
          headers: bearerHeaders(token),
        },
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followings.length, 0);
      assert.equal(response.body.pagination.total, 1);
      assert.equal(response.body.pagination.page, 100);
    });

    test("rejects invalid page and limit values", async () => {
      const { token, user } = await createUser();

      const invalidPage = await request(
        `${userFollowingsPath(user._id)}?page=0`,
        { headers: bearerHeaders(token) },
      );
      assert.equal(invalidPage.status, 422);
      assert.match(invalidPage.body.message, /page must be between 1 and 10000/);

      const invalidLimit = await request(
        `${userFollowingsPath(user._id)}?limit=101`,
        { headers: bearerHeaders(token) },
      );
      assert.equal(invalidLimit.status, 422);
      assert.match(invalidLimit.body.message, /limit must be between 1 and 100/);
    });
  });

  describe("scoping and sorting", () => {
    test("sorts followings by newest follow first", async () => {
      const { token, user } = await createUser();
      const [olderBuilding, newerBuilding] = await Promise.all([
        createBuilding({ name: "Older Building" }),
        createBuilding({ name: "Newer Building" }),
      ]);

      await createFollow({
        userId: user._id,
        buildingId: olderBuilding._id,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      });
      await createFollow({
        userId: user._id,
        buildingId: newerBuilding._id,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      });

      const response = await request(userFollowingsPath(user._id), {
        headers: bearerHeaders(token),
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.followings.length, 2);
      assert.equal(
        response.body.data.followings[0].buildingId,
        newerBuilding._id.toString(),
      );
      assert.equal(
        response.body.data.followings[1].buildingId,
        olderBuilding._id.toString(),
      );
    });

    test("scopes followings to the requested user only", async () => {
      const owner = await createUser();
      const otherUser = await createUser();
      const [ownerBuilding, otherBuilding] = await Promise.all([
        createBuilding({ name: "Owner Building" }),
        createBuilding({ name: "Other Building" }),
      ]);

      await BuildingFollow.create([
        {
          userId: owner.user._id,
          buildingId: ownerBuilding._id,
        },
        {
          userId: otherUser.user._id,
          buildingId: otherBuilding._id,
        },
      ]);

      const response = await request(userFollowingsPath(owner.user._id), {
        headers: bearerHeaders(owner.token),
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.pagination.total, 1);
      assert.equal(
        response.body.data.followings[0].buildingId,
        ownerBuilding._id.toString(),
      );
    });
  });

  describe("population", () => {
    test("returns mixed populated and null buildings in one response", async () => {
      const { token, user } = await createUser();
      const activeBuilding = await createBuilding({ name: "Active Building" });
      const inactiveBuilding = await createBuilding({
        name: "Inactive Building",
        isActive: false,
      });

      await BuildingFollow.create([
        { userId: user._id, buildingId: activeBuilding._id },
        { userId: user._id, buildingId: inactiveBuilding._id },
      ]);

      const response = await request(userFollowingsPath(user._id), {
        headers: bearerHeaders(token),
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.pagination.total, 2);

      const populated = response.body.data.followings.find(
        (following) =>
          following.buildingId === activeBuilding._id.toString(),
      );
      const unpopulated = response.body.data.followings.find(
        (following) =>
          following.buildingId === inactiveBuilding._id.toString(),
      );

      assert.equal(populated.building.name, "Active Building");
      assert.equal(unpopulated.building, null);
    });
  });

  describe("authentication", () => {
    test("returns 403 when the authenticated user is inactive", async () => {
      const inactiveUser = await createUser({
        status: USER_STATUSES.INACTIVE,
      });

      const response = await request(userFollowingsPath(inactiveUser.user._id), {
        headers: bearerHeaders(inactiveUser.token),
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, "ACCOUNT_INACTIVE");
    });
  });
});
