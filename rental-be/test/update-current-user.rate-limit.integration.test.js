import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, test } from "node:test";

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
process.env.RATE_LIMIT_SENSITIVE_ACTION_MAX = "2";

let User;
let baseUrl;
let httpServer;
let replSet;
let signAccessToken;

const updateCurrentUserPath = "/api/v1/users/me";

const bearerHeaders = (token) => ({
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
});

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

  process.env.MONGODB_URI = replSet.getUri("update_current_user_rate_limit_test");

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
  User = userModule.default;

  httpServer = createServer(appModule.createApp({ config }));
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
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

describe("PATCH /api/v1/users/me sensitive-action rate limiting", () => {
  test("returns 429 after exceeding the sensitive-action limit", async () => {
    const user = await User.create({
      name: "Rate Limit User",
      email: `${new mongoose.Types.ObjectId()}@example.com`,
    });
    const token = signAccessToken(user);

    const send = (name) =>
      fetch(`${baseUrl}${updateCurrentUserPath}`, {
        method: "PATCH",
        headers: bearerHeaders(token),
        body: JSON.stringify({ name }),
      });

    assert.equal((await send("First Update")).status, 200);
    assert.equal((await send("Second Update")).status, 200);

    const limitedResponse = await send("Third Update");
    assert.equal(limitedResponse.status, 429);
    assert.ok(limitedResponse.headers.get("ratelimit"));

    const body = await limitedResponse.json();
    assert.equal(typeof body.requestId, "string");
    assert.equal(limitedResponse.headers.get("x-request-id"), body.requestId);
    assert.deepEqual(body, {
      success: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      requestId: body.requestId,
    });
  });
});
