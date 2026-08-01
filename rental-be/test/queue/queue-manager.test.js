import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { QueueConfigurationError } from "../../shared/queue/errors.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  isQueueEnabled,
  resetQueueStateForTests,
} from "../../shared/queue/queue-manager.js";

describe("queue manager", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  test("starts disabled before initialization", () => {
    assert.equal(isQueueEnabled(), false);
    assert.throws(() => getQueue(), QueueConfigurationError);
  });

  test("initializes a disabled producer without touching redis", async () => {
    const state = await initializeQueueProducer({ enabled: false });

    assert.equal(state.enabled, false);
    assert.equal(isQueueEnabled(), false);
    assert.throws(() => getQueue(), QueueConfigurationError);

    await state.close();
  });

  test("closeQueueProducer is safe when nothing was initialized", async () => {
    await assert.doesNotReject(async () => closeQueueProducer());
  });

  test("returns the same disabled producer instance on repeat init", async () => {
    const first = await initializeQueueProducer({ enabled: false });
    const second = await initializeQueueProducer({ enabled: false });

    assert.equal(first, second);
  });
});
