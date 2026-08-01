import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { JOB_NAMES } from "../../shared/queue/constants.js";
import { handleSystemPingJob } from "../../shared/queue/handlers/system/ping.handler.js";

describe("handleSystemPingJob", () => {
  test("returns pong by default", async () => {
    const result = await handleSystemPingJob({
      name: JOB_NAMES.SYSTEM_PING,
      data: {},
      attemptsMade: 0,
    });

    assert.equal(result.ok, true);
    assert.equal(result.message, "pong");
    assert.equal(result.attempt, 1);
    assert.match(result.processedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  test("returns a trimmed custom message", async () => {
    const result = await handleSystemPingJob({
      name: JOB_NAMES.SYSTEM_PING,
      data: { message: "  worker alive  " },
      attemptsMade: 1,
    });

    assert.equal(result.message, "worker alive");
    assert.equal(result.attempt, 2);
  });

  test("falls back to pong for blank or invalid messages", async () => {
    for (const message of ["", "   ", null, 123, {}]) {
      const result = await handleSystemPingJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message },
        attemptsMade: 0,
      });

      assert.equal(result.message, "pong", `Expected pong fallback for ${String(message)}`);
    }
  });
});
