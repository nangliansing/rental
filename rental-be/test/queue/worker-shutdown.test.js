import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createWorkerGracefulShutdown } from "../../shared/runtime/worker-shutdown.js";

const quietLogger = {
  info() {},
  error() {},
};

describe("createWorkerGracefulShutdown", () => {
  test("closes queue resources and the database", async () => {
    const events = [];

    const shutdown = createWorkerGracefulShutdown({
      closeDatabase: async () => {
        events.push("database");
      },
      closeQueueResources: async () => {
        events.push("queue");
      },
      logger: quietLogger,
      timeoutMs: 1000,
    });

    await shutdown("test");

    assert.deepEqual(events, ["queue", "database"]);
  });

  test("reuses the same shutdown promise for repeated calls", async () => {
    let closeCount = 0;

    const shutdown = createWorkerGracefulShutdown({
      closeDatabase: async () => {
        closeCount += 1;
      },
      closeQueueResources: async () => {},
      logger: quietLogger,
      timeoutMs: 1000,
    });

    const first = shutdown("test");
    const second = shutdown("test");

    assert.equal(first, second);
    await first;
    assert.equal(closeCount, 1);
  });

  test("surfaces resource close failures", async () => {
    const shutdown = createWorkerGracefulShutdown({
      closeDatabase: async () => {},
      closeQueueResources: async () => {
        throw new Error("queue close failed");
      },
      logger: quietLogger,
      timeoutMs: 1000,
    });

    await assert.rejects(
      () => shutdown("test"),
      (error) => {
        const messages =
          error instanceof AggregateError
            ? error.errors.map((entry) => entry.message)
            : [error.message];

        assert.ok(
          messages.some((message) => message.includes("queue close failed")),
        );
        return true;
      },
    );
  });
});
