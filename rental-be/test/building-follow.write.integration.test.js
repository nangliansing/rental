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

import { BUILDING_FOLLOW_ERROR_CODES } from "../modules/building-follow/building-follow.constants.js";
import { USER_ROLES, USER_STATUSES } from "../modules/user/user.constants.js";

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
let BuildingFollow;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const followPath = (buildingId) =>
  `/api/v1/building-follows/${buildingId.toString()}`;

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

const assertFollowRecord = (record, { userId, buildingId }) => {
  assert.equal(typeof record._id, "string");
  assert.equal(record.userId, userId.toString());
  assert.equal(record.buildingId, buildingId.toString());
  assert.equal(typeof record.createdAt, "string");
  assert.equal(typeof record.updatedAt, "string");
};

const createUser = async ({
  role = USER_ROLES.USER,
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: `Follow test ${role} ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const createBuilding = async ({
  isActive = true,
  createdBy = new mongoose.Types.ObjectId(),
} = {}) => {
  return Building.create({
    name: "Follow Test Building",
    buildingType: "Apartment",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    address: "Bangkok",
    createdBy,
    isActive,
  });
};

const followBuilding = async ({ token, buildingId }) => {
  return request(followPath(buildingId), {
    method: "POST",
    headers: bearerHeaders(token),
  });
};

const unfollowBuilding = async ({ token, buildingId }) => {
  return request(followPath(buildingId), {
    method: "DELETE",
    headers: bearerHeaders(token),
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

  process.env.MONGODB_URI = replSet.getUri("building_follow_write_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, buildingFollowModule, buildingModule, userModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/building-follow/building-follow.model.js"),
      import("../modules/building/building.model.js"),
      import("../modules/user/user.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
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

describe("POST /api/v1/building-follows/:buildingId", () => {
  test("creates a follow for an active building", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const response = await followBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assertFollowRecord(response.body.data, {
      userId: user._id,
      buildingId: building._id,
    });

    const saved = await BuildingFollow.findOne({
      userId: user._id,
      buildingId: building._id,
    }).lean();

    assert.ok(saved);
    assert.equal(await BuildingFollow.countDocuments(), 1);
  });

  test("allows different users to follow the same building", async () => {
    const first = await createUser();
    const second = await createUser();
    const building = await createBuilding({ createdBy: first.user._id });

    const [firstResponse, secondResponse] = await Promise.all([
      followBuilding({ token: first.token, buildingId: building._id }),
      followBuilding({ token: second.token, buildingId: building._id }),
    ]);

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(await BuildingFollow.countDocuments(), 2);
  });

  test("allows the same user to follow different buildings", async () => {
    const { token, user } = await createUser();
    const [firstBuilding, secondBuilding] = await Promise.all([
      createBuilding({ createdBy: user._id }),
      createBuilding({ createdBy: user._id }),
    ]);

    const firstResponse = await followBuilding({
      token,
      buildingId: firstBuilding._id,
    });
    const secondResponse = await followBuilding({
      token,
      buildingId: secondBuilding._id,
    });

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(await BuildingFollow.countDocuments(), 2);
  });

  test("handles concurrent follow requests for the same building", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const [firstResponse, secondResponse] = await Promise.all([
      followBuilding({ token, buildingId: building._id }),
      followBuilding({ token, buildingId: building._id }),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort(
      (left, right) => left - right,
    );
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(await BuildingFollow.countDocuments(), 1);
  });

  test("returns 409 when the building is already followed", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const firstResponse = await followBuilding({
      token,
      buildingId: building._id,
    });
    const duplicateResponse = await followBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(firstResponse.status, 201);
    assert.equal(duplicateResponse.status, 409);
    assert.equal(duplicateResponse.body.success, false);
    assert.equal(
      duplicateResponse.body.code,
      BUILDING_FOLLOW_ERROR_CODES.ALREADY_FOLLOWED,
    );
    assertRequestId(duplicateResponse);
    assert.equal(await BuildingFollow.countDocuments(), 1);
  });

  test("returns 404 when the building does not exist", async () => {
    const { token } = await createUser();
    const missingBuildingId = new mongoose.Types.ObjectId();

    const response = await followBuilding({
      token,
      buildingId: missingBuildingId,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "BUILDING_NOT_FOUND");
    assertRequestId(response);
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("returns 404 when the building is inactive", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({
      createdBy: user._id,
      isActive: false,
    });

    const response = await followBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "BUILDING_NOT_FOUND");
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("returns 422 for an invalid building id", async () => {
    const { token } = await createUser();

    const response = await followBuilding({
      token,
      buildingId: "not-a-valid-id",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assertRequestId(response);
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("requires an access token", async () => {
    const building = await createBuilding();

    const response = await request(followPath(building._id), {
      method: "POST",
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
    assertRequestId(response);
  });

  test("rejects an invalid access token", async () => {
    const building = await createBuilding();

    const response = await followBuilding({
      token: "invalid-access-token",
      buildingId: building._id,
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
  });

  for (const [status, expectedCode] of [
    [USER_STATUSES.SUSPENDED, "ACCOUNT_SUSPENDED"],
    [USER_STATUSES.INACTIVE, "ACCOUNT_INACTIVE"],
  ]) {
    test(`rejects a ${status.toLowerCase()} user`, async () => {
      const { token } = await createUser({ status });
      const building = await createBuilding();

      const response = await followBuilding({
        token,
        buildingId: building._id,
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
      assert.equal(await BuildingFollow.countDocuments(), 0);
    });
  }

  test("rejects a token whose user no longer exists", async () => {
    const building = await createBuilding();
    const token = signAccessToken({
      _id: new mongoose.Types.ObjectId(),
      role: USER_ROLES.USER,
    });

    const response = await followBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
  });
});

describe("DELETE /api/v1/building-follows/:buildingId", () => {
  test("removes an existing follow", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const followResponse = await followBuilding({
      token,
      buildingId: building._id,
    });
    const unfollowResponse = await unfollowBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(followResponse.status, 201);
    assert.equal(unfollowResponse.status, 200);
    assert.equal(unfollowResponse.body.success, true);
    assertFollowRecord(unfollowResponse.body.data, {
      userId: user._id,
      buildingId: building._id,
    });
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("returns 404 when the user is not following the building", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const response = await unfollowBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      BUILDING_FOLLOW_ERROR_CODES.NOT_FOLLOWED,
    );
    assertRequestId(response);
  });

  test("returns 404 on a second unfollow attempt", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    await followBuilding({ token, buildingId: building._id });

    const firstUnfollow = await unfollowBuilding({
      token,
      buildingId: building._id,
    });
    const secondUnfollow = await unfollowBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(firstUnfollow.status, 200);
    assert.equal(secondUnfollow.status, 404);
    assert.equal(
      secondUnfollow.body.code,
      BUILDING_FOLLOW_ERROR_CODES.NOT_FOLLOWED,
    );
  });

  test("does not remove another user's follow", async () => {
    const owner = await createUser();
    const other = await createUser();
    const building = await createBuilding({ createdBy: owner.user._id });

    await followBuilding({
      token: owner.token,
      buildingId: building._id,
    });

    const response = await unfollowBuilding({
      token: other.token,
      buildingId: building._id,
    });

    assert.equal(response.status, 404);
    assert.equal(
      response.body.code,
      BUILDING_FOLLOW_ERROR_CODES.NOT_FOLLOWED,
    );
    assert.equal(await BuildingFollow.countDocuments(), 1);
  });

  test("unfollows when the building later becomes inactive", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    await followBuilding({ token, buildingId: building._id });
    await Building.updateOne({ _id: building._id }, { isActive: false });

    const response = await unfollowBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 200);
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("unfollows when the building was deleted after follow", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    await followBuilding({ token, buildingId: building._id });
    await Building.deleteOne({ _id: building._id });

    const response = await unfollowBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(response.status, 200);
    assert.equal(await BuildingFollow.countDocuments(), 0);
  });

  test("returns 422 for an invalid building id", async () => {
    const { token } = await createUser();

    const response = await unfollowBuilding({
      token,
      buildingId: "not-a-valid-id",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });

  test("requires an access token", async () => {
    const building = await createBuilding();

    const response = await request(followPath(building._id), {
      method: "DELETE",
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
  });
});

describe("building follow lifecycle", () => {
  test("supports follow, unfollow, and follow again", async () => {
    const { token, user } = await createUser();
    const building = await createBuilding({ createdBy: user._id });

    const firstFollow = await followBuilding({
      token,
      buildingId: building._id,
    });
    const unfollow = await unfollowBuilding({
      token,
      buildingId: building._id,
    });
    const secondFollow = await followBuilding({
      token,
      buildingId: building._id,
    });

    assert.equal(firstFollow.status, 201);
    assert.equal(unfollow.status, 200);
    assert.equal(secondFollow.status, 201);
    assert.equal(await BuildingFollow.countDocuments(), 1);

    const saved = await BuildingFollow.findOne({
      userId: user._id,
      buildingId: building._id,
    }).lean();

    assert.ok(saved);
    assert.notEqual(
      secondFollow.body.data._id,
      firstFollow.body.data._id,
    );
  });
});
