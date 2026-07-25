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
process.env.RATE_LIMIT_AUTH_MAX = "100";

let baseUrl;
let Building;
let httpServer;
let replSet;
let signAccessToken;
let User;
let USER_ROLES;
let USER_STATUSES;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return { body, headers: response.headers, status: response.status };
};

const assertRequestId = (response) => {
  assert.equal(typeof response.body.requestId, "string");
  assert.equal(response.headers.get("x-request-id"), response.body.requestId);
};

const createUserAndToken = async ({
  role = USER_ROLES.OWNER,
  status = USER_STATUSES.ACTIVE,
} = {}) => {
  const user = await User.create({
    name: `Test ${role} ${status}`,
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    role,
    status,
  });

  return {
    token: signAccessToken(user),
    user,
  };
};

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

before(async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Integration tests require NODE_ENV=test");
  }

  const replSetOptions = {
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  };

  replSet = await MongoMemoryReplSet.create(replSetOptions);

  const testDatabaseUri = replSet.getUri("rental_be_test");

  if (!testDatabaseUri.includes("rental_be_test")) {
    throw new Error("Refusing to connect tests to a non-test database");
  }

  process.env.MONGODB_URI = testDatabaseUri;

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
    buildingModelModule,
    userModelModule,
    userConstantsModule,
  ] =
    await Promise.all([
      import("../app.js"),
      import("../shared/auth/index.js"),
      import("../modules/building/building.model.js"),
      import("../modules/user/user.model.js"),
      import("../modules/user/user.constants.js"),
    ]);

  signAccessToken = authModule.signAccessToken;
  Building = buildingModelModule.default;
  User = userModelModule.default;
  USER_ROLES = userConstantsModule.USER_ROLES;
  USER_STATUSES = userConstantsModule.USER_STATUSES;

  httpServer = createServer(appModule.createApp({ config }));
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  const address = httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;

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

describe("application boundary", () => {
  test("returns health status", async () => {
    const response = await request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      message: "OK",
    });
  });

  test("returns liveness and readiness status", async () => {
    const [liveness, readiness] = await Promise.all([
      request("/health/live"),
      request("/health/ready"),
    ]);

    assert.equal(liveness.status, 200);
    assert.deepEqual(liveness.body, {
      success: true,
      message: "OK",
    });
    assert.equal(readiness.status, 200);
    assert.deepEqual(readiness.body, {
      success: true,
      message: "READY",
    });
  });

  test("allows credentialed requests from a configured browser origin", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { origin: "http://localhost:5173" },
    });

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  test("does not grant browser access to an unconfigured origin", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { origin: "https://untrusted.example.com" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  test("returns the standard not-found response", async () => {
    const response = await request("/does-not-exist");

    assert.equal(response.status, 404);
    assertRequestId(response);
    assert.deepEqual(response.body, {
      success: false,
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: response.body.requestId,
    });
  });

  test("returns the standard malformed JSON response", async () => {
    const response = await request("/api/v1/does-not-exist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"email":',
    });

    assert.equal(response.status, 400);
    assertRequestId(response);
    assert.deepEqual(response.body, {
      success: false,
      code: "INVALID_JSON",
      message: "Request body must be valid JSON",
      requestId: response.body.requestId,
    });
  });

  test("echoes a valid client request id on error responses", async () => {
    const response = await request("/does-not-exist", {
      headers: { "x-request-id": "client-request-123" },
    });

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-request-id"), "client-request-123");
    assert.equal(response.body.requestId, "client-request-123");
  });

  test("replaces an invalid client request id", async () => {
    const response = await request("/does-not-exist", {
      headers: { "x-request-id": "invalid request id" },
    });

    assert.equal(response.status, 404);
    assertRequestId(response);
    assert.notEqual(response.body.requestId, "invalid request id");
  });
});

describe("near-lines search boundary", () => {
  const requestBody = {
    geometry: {
      type: "LineString",
      coordinates: [
        [100.5, 13.75],
        [100.51, 13.75],
      ],
    },
    distanceMeters: 500,
    includeBuildingsWithoutMatchingListings: true,
  };

  test("supports anonymous and optionally authenticated requests", async () => {
    await Building.create({
      name: "HTTP route building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const { token } = await createUserAndToken();

    const [anonymous, authenticated, invalidToken] = await Promise.all([
      request("/api/v1/search/buildings/near-lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      }),
      request("/api/v1/search/buildings/near-lines", {
        method: "POST",
        headers: bearerHeaders(token),
        body: JSON.stringify(requestBody),
      }),
      request("/api/v1/search/buildings/near-lines", {
        method: "POST",
        headers: bearerHeaders("invalid-access-token"),
        body: JSON.stringify(requestBody),
      }),
    ]);

    for (const response of [anonymous, authenticated, invalidToken]) {
      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.length, 1);
      assert.equal(response.body.pagination.total, 1);
    }
  });

  test("returns standard validation errors for invalid geometry and distance", async () => {
    const [invalidGeometry, invalidDistance] = await Promise.all([
      request("/api/v1/search/buildings/near-lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...requestBody,
          geometry: { type: "Point", coordinates: [100.5, 13.75] },
        }),
      }),
      request("/api/v1/search/buildings/near-lines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...requestBody, distanceMeters: 2001 }),
      }),
    ]);

    for (const response of [invalidGeometry, invalidDistance]) {
      assert.equal(response.status, 422);
      assert.equal(response.body.success, false);
      assert.equal(response.body.code, "VALIDATION_ERROR");
      assertRequestId(response);
    }
  });
});

describe("Google authentication boundary", () => {
  const googleLogin = (body, origin = "http://localhost:5173") =>
    request("/api/v1/users/login/google", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify(body),
    });

  test("requires a trusted browser origin", async () => {
    const [missingOrigin, untrustedOrigin] = await Promise.all([
      googleLogin({ credential: "credential" }, null),
      googleLogin(
        { credential: "credential" },
        "https://untrusted.example.com",
      ),
    ]);

    for (const response of [missingOrigin, untrustedOrigin]) {
      assert.equal(response.status, 403);
      assert.equal(response.body.code, "FORBIDDEN");
      assertRequestId(response);
    }
  });

  test("requires an object body with a credential", async () => {
    const [arrayBody, nullBody, missingCredential] = await Promise.all([
      googleLogin([]),
      googleLogin(null),
      googleLogin({}),
    ]);

    assert.equal(arrayBody.status, 422);
    assert.equal(arrayBody.body.code, "VALIDATION_ERROR");
    assert.equal(arrayBody.body.message, "body must be an object");
    assert.equal(nullBody.status, 422);
    assert.equal(nullBody.body.code, "VALIDATION_ERROR");
    assert.equal(nullBody.body.message, "body must be an object");
    assert.equal(missingCredential.status, 422);
    assert.equal(missingCredential.body.code, "VALIDATION_ERROR");
    assert.equal(missingCredential.body.message, "credential is required");
  });

  test("rejects invalid credential values and unknown fields", async () => {
    const [wrongType, nullValue, blank, tooLong, unknownField] =
      await Promise.all([
      googleLogin({ credential: 123 }),
      googleLogin({ credential: null }),
      googleLogin({ credential: "   " }),
      googleLogin({ credential: "x".repeat(10_001) }),
      googleLogin({ credential: "credential", role: "OWNER" }),
    ]);

    assert.equal(wrongType.status, 422);
    assert.equal(wrongType.body.message, "credential must be a string");
    assert.equal(nullValue.status, 422);
    assert.equal(nullValue.body.message, "credential must be a string");
    assert.equal(blank.status, 422);
    assert.equal(blank.body.message, "credential is required");
    assert.equal(tooLong.status, 422);
    assert.equal(
      tooLong.body.message,
      "credential must be at most 10000 characters",
    );
    assert.equal(unknownField.status, 422);
    assert.equal(unknownField.body.message, "Unknown fields: role");
  });

  test("maps an unverifiable Google credential to a stable auth error", async () => {
    const response = await googleLogin({ credential: "not-a-google-jwt" });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_GOOGLE_CREDENTIAL");
    assert.equal(
      response.body.message,
      "Google sign-in could not be verified",
    );
    assertRequestId(response);
  });

  test("returns the standard malformed JSON response", async () => {
    const response = await request("/api/v1/users/login/google", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173",
      },
      body: '{"credential":',
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "INVALID_JSON");
    assert.equal(response.body.message, "Request body must be valid JSON");
    assertRequestId(response);
  });

  test("allows preflight from the configured browser origin", async () => {
    const response = await fetch(`${baseUrl}/api/v1/users/login/google`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.match(response.headers.get("access-control-allow-methods"), /POST/);
  });
});

describe("logout boundary", () => {
  const logout = (cookie) =>
    request("/api/v1/users/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({}),
    });

  const assertClearsRefreshToken = (response) => {
    const setCookie = response.headers.get("set-cookie");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      message: "Logged out successfully",
    });
    assert.match(setCookie, /^refreshToken=;/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
    assert.match(setCookie, /SameSite=Strict/i);
  };

  test("clears an existing refresh-token cookie", async () => {
    const response = await logout("refreshToken=existing-token");

    assertClearsRefreshToken(response);
  });

  test("is idempotent when the refresh-token cookie is absent", async () => {
    const response = await logout();

    assertClearsRefreshToken(response);
  });
});

describe("V1 authentication routes", () => {
  for (const path of [
    "/api/v1/users/signup/password",
    "/api/v1/users/login/password",
  ]) {
    test(`POST ${path} is not exposed`, async () => {
      const response = await request(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 404);
      assert.equal(response.body.code, "NOT_FOUND");
      assertRequestId(response);
    });
  }

  test("keeps refresh-token handling exposed", async () => {
    const response = await request("/api/v1/users/token/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "REFRESH_TOKEN_REQUIRED");
  });
});

describe("admin authentication boundary", () => {
  test("requires an access token", async () => {
    const response = await request("/api/v1/admin/reports");

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "ACCESS_TOKEN_REQUIRED");
  });

  test("rejects an invalid access token", async () => {
    const response = await request("/api/v1/admin/reports", {
      headers: bearerHeaders("invalid-token"),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "INVALID_ACCESS_TOKEN");
  });

  test("uses the current database role instead of a stale token role", async () => {
    const user = await User.create({
      name: "Demoted Admin",
      email: "demoted-admin@example.com",
      role: USER_ROLES.USER,
      status: USER_STATUSES.ACTIVE,
    });
    const token = signAccessToken({
      _id: user._id,
      role: USER_ROLES.OWNER,
    });
    const response = await request("/api/v1/admin/reports", {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "FORBIDDEN");
  });

  for (const [status, expectedCode] of [
    ["SUSPENDED", "ACCOUNT_SUSPENDED"],
    ["INACTIVE", "ACCOUNT_INACTIVE"],
  ]) {
    test(`rejects a ${status.toLowerCase()} admin`, async () => {
      const { token } = await createUserAndToken({ status });
      const response = await request("/api/v1/admin/reports", {
        headers: bearerHeaders(token),
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.code, expectedCode);
    });
  }

  test("rejects a token whose user no longer exists", async () => {
    const token = signAccessToken({
      _id: new mongoose.Types.ObjectId(),
      role: USER_ROLES.OWNER,
    });
    const response = await request("/api/v1/admin/reports", {
      headers: bearerHeaders(token),
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "USER_NOT_FOUND");
  });
});

describe("dormant admin routes", () => {
  const dormantRequests = [
    ["POST", "/api/v1/admin/buildings"],
    ["PATCH", `/api/v1/admin/buildings/${new mongoose.Types.ObjectId()}`],
    ["POST", "/api/v1/admin/listings"],
    [
      "PATCH",
      `/api/v1/admin/agent-profiles/${new mongoose.Types.ObjectId()}`,
    ],
  ];

  for (const [method, path] of dormantRequests) {
    test(`${method} ${path} is not exposed`, async () => {
      const { token } = await createUserAndToken();
      const response = await request(path, {
        method,
        headers: bearerHeaders(token),
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 404);
      assert.equal(response.body.code, "NOT_FOUND");
    });
  }

  test("keeps admin listing deletion exposed", async () => {
    const { token } = await createUserAndToken();
    const listingId = new mongoose.Types.ObjectId();
    const response = await request(`/api/v1/admin/listings/${listingId}`, {
      method: "DELETE",
      headers: bearerHeaders(token),
      body: JSON.stringify({ reason: "Baseline route test" }),
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "LISTING_NOT_FOUND");
  });
});
