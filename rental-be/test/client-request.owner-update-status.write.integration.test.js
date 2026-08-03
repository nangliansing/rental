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
  "content-type": "application/json",
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
    name: `Client request status ${role} ${status}`,
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
  },
  ...overrides,
});

const createClientRequest = async ({ token, body }) => {
  return request(createPath, {
    method: "POST",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
};

const updateClientRequestStatus = async ({
  token,
  clientRequestId,
  body,
}) => {
  return request(`${createPath}/${clientRequestId}/status`, {
    method: "PATCH",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
};

const updateClientRequest = async ({ token, clientRequestId, body }) => {
  return request(`${createPath}/${clientRequestId}`, {
    method: "PATCH",
    headers: bearerHeaders(token),
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
    "client_request_owner_update_status_write_test",
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

describe("PATCH /api/v1/client-requests/:clientRequestId/status", () => {
  test("closes an owned Waiting client request", async () => {
    const { token, user } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, CLIENT_REQUEST_STATUSES.WAITING);

    const response = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data._id, created.body.data._id);
    assert.equal(response.body.data.createdBy, user._id.toString());
    assert.equal(response.body.data.status, CLIENT_REQUEST_STATUSES.CLOSED);

    const saved = await ClientRequest.findById(created.body.data._id).lean();
    assert.equal(saved.status, CLIENT_REQUEST_STATUSES.CLOSED);
    assert.equal(saved.isDeleted, false);
  });

  test("returns 409 when the client request is already Closed", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    const first = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });
    assert.equal(first.status, 200);

    const second = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });

    assert.equal(second.status, 409);
    assert.equal(second.body.code, "CLIENT_REQUEST_CLOSED");
    assertRequestId(second);
  });

  test("returns 404 for another user's client request", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = await createClientRequest({
      token: owner.token,
      body: areaBody(),
    });

    const response = await updateClientRequestStatus({
      token: other.token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "CLIENT_REQUEST_NOT_FOUND");

    const saved = await ClientRequest.findById(created.body.data._id).lean();
    assert.equal(saved.status, CLIENT_REQUEST_STATUSES.WAITING);
  });

  test("returns 404 for a soft-deleted client request", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    await ClientRequest.updateOne(
      { _id: created.body.data._id },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
    );

    const response = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "CLIENT_REQUEST_NOT_FOUND");
  });

  test("closed requests cannot be content-updated afterward", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    const closed = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
    });
    assert.equal(closed.status, 200);

    const updated = await updateClientRequest({
      token,
      clientRequestId: created.body.data._id,
      body: { name: "After close" },
    });

    assert.equal(updated.status, 409);
    assert.equal(updated.body.code, "CLIENT_REQUEST_CLOSED");
  });

  test("rejects Waiting and unknown body fields", async () => {
    const { token } = await createUser();
    const created = await createClientRequest({
      token,
      body: areaBody(),
    });

    const waiting = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: { status: CLIENT_REQUEST_STATUSES.WAITING },
    });
    assert.equal(waiting.status, 422);
    assert.equal(waiting.body.message, "status must be Closed");

    const unknown = await updateClientRequestStatus({
      token,
      clientRequestId: created.body.data._id,
      body: {
        status: CLIENT_REQUEST_STATUSES.CLOSED,
        name: "Nope",
      },
    });
    assert.equal(unknown.status, 422);
    assert.match(unknown.body.message, /Unknown fields/);

    const saved = await ClientRequest.findById(created.body.data._id).lean();
    assert.equal(saved.status, CLIENT_REQUEST_STATUSES.WAITING);
  });

  test("requires an access token", async () => {
    const response = await request(
      `${createPath}/${new mongoose.Types.ObjectId().toString()}/status`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: CLIENT_REQUEST_STATUSES.CLOSED }),
      },
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

      const response = await updateClientRequestStatus({
        token: active.token,
        clientRequestId: created.body.data._id,
        body: { status: CLIENT_REQUEST_STATUSES.CLOSED },
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
      assertRequestId(response);
    });
  }
});
