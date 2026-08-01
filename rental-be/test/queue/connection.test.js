import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  attachQueueConnectionLogging,
  closeQueueConnection,
  connectQueueRedis,
  createQueueConnection,
} from "../../shared/queue/connection.js";

describe("queue connection helpers", () => {
  test("requires a redis url to create a connection", () => {
    assert.throws(
      () => createQueueConnection({ redisUrl: "" }),
      /Queue Redis URL is required/,
    );

    assert.throws(
      () => createQueueConnection({ redisUrl: "   " }),
      /Queue Redis URL is required/,
    );
  });

  test("creates a lazy connection config", () => {
    const connection = createQueueConnection({
      redisUrl: "redis://127.0.0.1:6379",
    });

    assert.equal(connection.options.lazyConnect, true);
    assert.equal(connection.options.enableReadyCheck, true);
    connection.disconnect();
  });

  test("connect and close helpers tolerate missing connections", async () => {
    await connectQueueRedis(null);
    await closeQueueConnection(null);
    await closeQueueConnection(undefined);
  });

  test("attachQueueConnectionLogging is a no-op without a logger", () => {
    const connection = createQueueConnection({
      redisUrl: "redis://127.0.0.1:6379",
    });

    assert.doesNotThrow(() =>
      attachQueueConnectionLogging(connection, { role: "test" }),
    );
    assert.doesNotThrow(() =>
      attachQueueConnectionLogging(null, {
        logger: { info() {}, error() {} },
        role: "test",
      }),
    );

    connection.disconnect();
  });
});
