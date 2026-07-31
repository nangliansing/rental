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
process.env.RATE_LIMIT_SENSITIVE_ACTION_MAX = "1000";

let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;
let signRefreshToken;

const updateCurrentUserPath = "/api/v1/users/me";
const getCurrentUserPath = "/api/v1/users/me";

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, headers: response.headers, status: response.status };
};

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

const assertRequestId = (response) => {
  assert.equal(typeof response.body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), response.body.requestId);
};

const createUser = async ({
  name = "Current User",
  status = USER_STATUSES.ACTIVE,
  role = USER_ROLES.USER,
} = {}) => {
  const user = await User.create({
    name,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
};

const alternateProfilePhoto = {
  publicId: "users/alternate-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/alternate.jpg",
  resourceType: "image",
  format: "jpg",
  width: 400,
  height: 400,
  bytes: 80000,
  position: 0,
  alt: "Alternate profile photo",
  isCover: false,
};

const minimalProfilePhoto = {
  publicId: "users/minimal-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/minimal.jpg",
};

const patchCurrentUser = async ({ token, body, headers = {} }) => {
  return request(updateCurrentUserPath, {
    method: "PATCH",
    headers: {
      ...bearerHeaders(token),
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const getCurrentUser = async ({ token }) => {
  return request(getCurrentUserPath, {
    method: "GET",
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

  process.env.MONGODB_URI = replSet.getUri("update_current_user_test");

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, userModule] = await Promise.all([
    import("../app.js"),
    import("../shared/auth/index.js"),
    import("../modules/user/user.model.js"),
  ]);

  signAccessToken = authModule.signAccessToken;
  signRefreshToken = authModule.signRefreshToken;
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

describe("PATCH /api/v1/users/me success cases", () => {
  test("updates name and returns safe user response", async () => {
    const { token, user } = await createUser({ name: "Before Update" });

    const response = await patchCurrentUser({
      token,
      body: { name: "After Update" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user._id, user._id.toString());
    assert.equal(response.body.data.user.name, "After Update");
    assert.equal(response.body.data.user.email, user.email);
    assert.equal(response.body.data.user.profilePhoto, null);
    assert.equal(response.body.data.password, undefined);

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.name, "After Update");
  });

  test("trims whitespace from name", async () => {
    const { token, user } = await createUser({ name: "Before Update" });

    const response = await patchCurrentUser({
      token,
      body: { name: "  Trimmed Name  " },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.name, "Trimmed Name");

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.name, "Trimmed Name");
  });

  test("updates profilePhoto and GET /me returns the same value", async () => {
    const { token, user } = await createUser();

    const patchResponse = await patchCurrentUser({
      token,
      body: { profilePhoto: sampleProfilePhoto },
    });

    assert.equal(patchResponse.status, 200);
    assert.deepEqual(
      patchResponse.body.data.user.profilePhoto,
      sampleProfilePhoto,
    );

    const getResponse = await getCurrentUser({ token });

    assert.equal(getResponse.status, 200);
    assert.deepEqual(getResponse.body.data.user.profilePhoto, sampleProfilePhoto);

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.profilePhoto.publicId, sampleProfilePhoto.publicId);
  });

  test("accepts profilePhoto with only required media fields", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: minimalProfilePhoto },
    });

    assert.equal(response.status, 200);
    assert.equal(
      response.body.data.user.profilePhoto.publicId,
      minimalProfilePhoto.publicId,
    );
    assert.equal(
      response.body.data.user.profilePhoto.secureUrl,
      minimalProfilePhoto.secureUrl,
    );
    assert.equal(response.body.data.user.profilePhoto.resourceType, "image");
  });

  test("replaces an existing profilePhoto", async () => {
    const { token, user } = await createUser();

    await User.findByIdAndUpdate(user._id, {
      $set: { profilePhoto: sampleProfilePhoto },
    });

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: alternateProfilePhoto },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.user.profilePhoto,
      alternateProfilePhoto,
    );
  });

  test("clears profilePhoto with null", async () => {
    const { token, user } = await createUser();

    await User.findByIdAndUpdate(user._id, {
      $set: { profilePhoto: sampleProfilePhoto },
    });

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: null },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.profilePhoto, null);

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.profilePhoto, null);
  });

  test("updates name and profilePhoto together", async () => {
    const { token, user } = await createUser({ name: "Before Update" });

    const response = await patchCurrentUser({
      token,
      body: {
        name: "Combined Update",
        profilePhoto: sampleProfilePhoto,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.name, "Combined Update");
    assert.deepEqual(response.body.data.user.profilePhoto, sampleProfilePhoto);

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.name, "Combined Update");
    assert.equal(saved.profilePhoto.publicId, sampleProfilePhoto.publicId);
  });

  test("GET /me returns profilePhoto null by default", async () => {
    const { token } = await createUser();

    const response = await getCurrentUser({ token });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.profilePhoto, null);
  });
});

describe("PATCH /api/v1/users/me validation", () => {
  test("rejects empty body", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: {},
    });

    assert.equal(response.status, 422);
    assertRequestId(response);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /No valid fields provided for update/);
  });

  test("rejects null body", async () => {
    const { token } = await createUser();

    const response = await request(updateCurrentUserPath, {
      method: "PATCH",
      headers: bearerHeaders(token),
      body: "null",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "body must be an object");
  });

  test("rejects malformed JSON", async () => {
    const { token } = await createUser();

    const response = await request(updateCurrentUserPath, {
      method: "PATCH",
      headers: bearerHeaders(token),
      body: '{"name":',
    });

    assert.equal(response.status, 400);
    assertRequestId(response);
    assert.equal(response.body.code, "INVALID_JSON");
    assert.equal(response.body.message, "Request body must be valid JSON");
  });

  test("rejects no-op name updates", async () => {
    const { token } = await createUser({ name: "Same Name" });

    const response = await patchCurrentUser({
      token,
      body: { name: "Same Name" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /No user changes provided/);
  });

  test("rejects no-op profilePhoto updates", async () => {
    const { token, user } = await createUser();

    await User.findByIdAndUpdate(user._id, {
      $set: { profilePhoto: sampleProfilePhoto },
    });

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: sampleProfilePhoto },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /No user changes provided/);
  });

  test("rejects body with only ignored fields", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: {
        email: "ignored@example.com",
        role: "ADMIN",
        status: USER_STATUSES.SUSPENDED,
        authProvider: "PASSWORD",
        password: "NewPassword123",
        userId: new mongoose.Types.ObjectId().toString(),
      },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /No valid fields provided for update/);
  });

  test("rejects empty name", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { name: "" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "name is required");
  });

  test("rejects whitespace-only name", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { name: "   " },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "name is required");
  });

  test("rejects non-string name", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { name: 123 },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "name must be a string");
  });

  test("rejects name longer than 255 characters", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { name: "a".repeat(256) },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "name must be at most 255 characters");
  });

  test("rejects invalid profilePhoto payload missing publicId", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: { secureUrl: "https://example.com/photo.jpg" } },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /profilePhoto\.publicId must be a string/);
  });

  test("rejects invalid profilePhoto payload missing secureUrl", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: { publicId: "users/missing-url" } },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.match(response.body.message, /profilePhoto\.secureUrl must be a string/);
  });

  test("rejects non-object profilePhoto payload", async () => {
    const { token } = await createUser();

    const response = await patchCurrentUser({
      token,
      body: { profilePhoto: "https://example.com/photo.jpg" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.equal(response.body.message, "profilePhoto must be an object");
  });
});

describe("PATCH /api/v1/users/me authorization and account state", () => {
  test("ignores server-controlled fields when valid fields are also sent", async () => {
    const { token, user } = await createUser({ name: "Stable Name" });

    const response = await patchCurrentUser({
      token,
      body: {
        name: "Changed Name",
        email: "hacker@example.com",
        role: "ADMIN",
        status: USER_STATUSES.SUSPENDED,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.name, "Changed Name");
    assert.equal(response.body.data.user.email, user.email);
    assert.equal(response.body.data.user.role, user.role);
    assert.equal(response.body.data.user.status, user.status);

    const saved = await User.findById(user._id).lean();
    assert.equal(saved.email, user.email);
    assert.equal(saved.role, user.role);
    assert.equal(saved.status, user.status);
  });

  test("does not update another user even when userId is sent in body", async () => {
    const { token, user } = await createUser({ name: "Self User" });
    const otherUser = await User.create({
      name: "Other User",
      email: `${new mongoose.Types.ObjectId()}@example.com`,
    });

    const response = await patchCurrentUser({
      token,
      body: {
        userId: otherUser._id.toString(),
        name: "Hijacked Name",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user._id, user._id.toString());
    assert.equal(response.body.data.user.name, "Hijacked Name");

    const savedSelf = await User.findById(user._id).lean();
    const savedOther = await User.findById(otherUser._id).lean();

    assert.equal(savedSelf.name, "Hijacked Name");
    assert.equal(savedOther.name, "Other User");
  });

  test("rejects missing access token", async () => {
    const response = await request(updateCurrentUserPath, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "No Token" }),
    });

    assert.equal(response.status, 401);
    assertRequestId(response);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
  });

  test("rejects malformed authorization header", async () => {
    const response = await request(updateCurrentUserPath, {
      method: "PATCH",
      headers: {
        authorization: "Token abc123",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Bad Auth" }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
  });

  test("rejects invalid access token", async () => {
    const response = await request(updateCurrentUserPath, {
      method: "PATCH",
      headers: bearerHeaders("not-a-valid-token"),
      body: JSON.stringify({ name: "Bad Token" }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
  });

  test("rejects refresh token used as access token", async () => {
    const { user } = await createUser();

    const response = await patchCurrentUser({
      token: signRefreshToken(user),
      body: { name: "Refresh Token User" },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
  });

  test("rejects a token whose user no longer exists", async () => {
    const response = await patchCurrentUser({
      token: signAccessToken({
        _id: new mongoose.Types.ObjectId(),
        role: USER_ROLES.USER,
      }),
      body: { name: "Missing User" },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
  });

  test("rejects deleted user with old access token", async () => {
    const { token, user } = await createUser();

    await User.findByIdAndDelete(user._id);

    const response = await patchCurrentUser({
      token,
      body: { name: "Deleted User" },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
  });

  for (const [status, expectedCode] of [
    [USER_STATUSES.INACTIVE, "ACCOUNT_INACTIVE"],
    [USER_STATUSES.SUSPENDED, "ACCOUNT_SUSPENDED"],
  ]) {
    test(`rejects ${status.toLowerCase()} user`, async () => {
      const { token, user } = await createUser({ status: USER_STATUSES.ACTIVE });

      await User.findByIdAndUpdate(user._id, {
        $set: { status },
      });

      const response = await patchCurrentUser({
        token,
        body: { name: "Should Fail" },
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
    });
  }
});
