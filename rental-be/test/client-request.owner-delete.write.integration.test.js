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

import {
  CLIENT_REQUEST_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";
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

let ClientRequest;
let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const createPath = "/api/v1/client-requests";

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

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

const createUser = async ({
  role = USER_ROLES.USER,
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: `Client request delete ${role} ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const areaBody = (overrides = {}) => ({
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
  },
  ...overrides,
});

const createClientRequest = async ({ token, body }) => {
  return request(createPath, {
    method: "POST",
    headers: {
      ...bearerHeaders(token),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

const deleteClientRequest = async ({ token, clientRequestId }) => {
  return request(`${createPath}/${clientRequestId}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
};

const updateClientRequest = async ({ token, clientRequestId, body }) => {
  return request(`${createPath}/${clientRequestId}`, {
    method: "PATCH",
    headers: {
      ...bearerHeaders(token),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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

  process.env.MONGODB_URI = replSet.getUri(
    "client_request_owner_delete_write_test",
  );

  const [{ initializeEnvironment }, { configureCloudinary }] =
    await Promise.all([
      import("../config/index.js"),
      import("../shared/config/cloudinary.js"),
    ]);
  const config = initializeEnvironment();

  configureCloudinary(config.cloudinary);
  await mongoose.connect(config.mongodbUri);

  const [appModule, authModule, clientRequestModule, userModule] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/client-request/client-request.model.js"),
      import("../modules/user/user.model.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  ClientRequest = clientRequestModule.default;
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

describe("DELETE /api/v1/client-requests/:clientRequestId", () => {
  test("soft-deletes an owned Waiting client request", async () => {
    const { token, user } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });
    assert.equal(created.status, 201);

    const before = Date.now();
    const response = await deleteClientRequest({
      token,
      clientRequestId: created.body.data._id,
    });
    const after = Date.now();

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data._id, created.body.data._id);
    assert.equal(response.body.data.createdBy, user._id.toString());
    assert.equal(response.body.data.isDeleted, true);
    assert.equal(typeof response.body.data.deletedAt, "string");

    const deletedAtMs = new Date(response.body.data.deletedAt).getTime();
    assert.equal(deletedAtMs >= before - 1000, true);
    assert.equal(deletedAtMs <= after + 1000, true);

    const saved = await ClientRequest.findById(created.body.data._id).lean();
    assert.equal(saved.isDeleted, true);
    assert.equal(saved.deletedAt instanceof Date, true);
    assert.equal(saved.name, "Sukhumvit 2BR");
    assert.equal(saved.status, CLIENT_REQUEST_STATUSES.WAITING);
    assert.equal(await ClientRequest.countDocuments(), 1);
  });

  test("allows soft-deleting a Closed client request", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    await ClientRequest.updateOne(
      { _id: created.body.data._id },
      { $set: { status: CLIENT_REQUEST_STATUSES.CLOSED } },
    );

    const response = await deleteClientRequest({
      token,
      clientRequestId: created.body.data._id,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.isDeleted, true);
    assert.equal(response.body.data.status, CLIENT_REQUEST_STATUSES.CLOSED);
  });

  test("returns 404 when deleting again", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    const first = await deleteClientRequest({
      token,
      clientRequestId: created.body.data._id,
    });
    assert.equal(first.status, 200);

    const second = await deleteClientRequest({
      token,
      clientRequestId: created.body.data._id,
    });

    assert.equal(second.status, 404);
    assert.equal(second.body.code, "CLIENT_REQUEST_NOT_FOUND");
    assertRequestId(second);
  });

  test("returns 404 for another user's client request", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = await createClientRequest({
      token: owner.token,
      body: areaBody(),
    });

    const response = await deleteClientRequest({
      token: other.token,
      clientRequestId: created.body.data._id,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "CLIENT_REQUEST_NOT_FOUND");
    assertRequestId(response);

    const saved = await ClientRequest.findById(created.body.data._id).lean();
    assert.equal(saved.isDeleted, false);
    assert.equal(saved.deletedAt, null);
  });

  test("soft-deleted requests cannot be updated afterward", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    const deleted = await deleteClientRequest({
      token,
      clientRequestId: created.body.data._id,
    });
    assert.equal(deleted.status, 200);

    const updated = await updateClientRequest({
      token,
      clientRequestId: created.body.data._id,
      body: { name: "After delete" },
    });

    assert.equal(updated.status, 404);
    assert.equal(updated.body.code, "CLIENT_REQUEST_NOT_FOUND");
  });

  test("requires an access token", async () => {
    const response = await request(
      `${createPath}/${new mongoose.Types.ObjectId().toString()}`,
      { method: "DELETE" },
    );

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
    assertRequestId(response);
  });

  for (const [status, expectedCode] of [
    [USER_STATUSES.SUSPENDED, "ACCOUNT_SUSPENDED"],
    [USER_STATUSES.INACTIVE, "ACCOUNT_INACTIVE"],
  ]) {
    test(`rejects a ${status.toLowerCase()} user`, async () => {
      const active = await createUser();
      const created = await createClientRequest({
        token: active.token,
        body: areaBody(),
      });

      await User.updateOne({ _id: active.user._id }, { $set: { status } });

      const response = await deleteClientRequest({
        token: active.token,
        clientRequestId: created.body.data._id,
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
      assertRequestId(response);

      const saved = await ClientRequest.findById(created.body.data._id).lean();
      assert.equal(saved.isDeleted, false);
    });
  }

  test("returns 422 for an invalid clientRequestId", async () => {
    const { token } = await createUser();

    const response = await deleteClientRequest({
      token,
      clientRequestId: "not-an-id",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assertRequestId(response);
  });
});
