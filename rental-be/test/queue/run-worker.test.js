import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { startQueueWorker } from "../../shared/queue/run-worker.js";

describe("startQueueWorker", () => {
  test("refuses to start when the queue is disabled", async () => {
    await assert.rejects(
      () => startQueueWorker({ enabled: false }),
      /QUEUE_ENABLED=false/,
    );
  });
});
