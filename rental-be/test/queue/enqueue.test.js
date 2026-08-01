import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { JOB_NAMES } from "../../shared/queue/constants.js";
import { JobValidationError } from "../../shared/queue/errors.js";
import { UnknownJobHandlerError } from "../../shared/queue/errors.js";
import { enqueueJob } from "../../shared/queue/enqueue.js";
import {
  closeQueueProducer,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../../shared/queue/queue-manager.js";

describe("enqueueJob", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  test("returns disabled when the queue producer is not enabled", async () => {
    await initializeQueueProducer({ enabled: false });

    const result = await enqueueJob({
      name: JOB_NAMES.SYSTEM_PING,
      data: { message: "hello" },
    });

    assert.deepEqual(result, {
      enqueued: false,
      reason: "disabled",
      name: JOB_NAMES.SYSTEM_PING,
    });
  });

  test("rejects invalid payloads before touching the queue", async () => {
    await initializeQueueProducer({ enabled: false });

    await assert.rejects(
      () =>
        enqueueJob({
          name: "bad-name",
          data: {},
        }),
      JobValidationError,
    );
  });

  test("defaults job data to an empty object", async () => {
    await initializeQueueProducer({ enabled: false });

    const result = await enqueueJob({
      name: JOB_NAMES.SYSTEM_PING,
    });

    assert.equal(result.enqueued, false);
    assert.equal(result.name, JOB_NAMES.SYSTEM_PING);
  });
});
