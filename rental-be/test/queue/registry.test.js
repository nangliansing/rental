import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { JOB_NAMES } from "../../shared/queue/constants.js";
import { UnknownJobHandlerError } from "../../shared/queue/errors.js";
import {
  clearJobHandlersForTests,
  createJobHandlerRunner,
  listRegisteredJobHandlers,
  registerJobHandler,
  resolveJobHandler,
} from "../../shared/queue/handlers/registry.js";
import { registerDefaultJobHandlers } from "../../shared/queue/handlers/index.js";

describe("job handler registry", () => {
  afterEach(() => {
    clearJobHandlersForTests();
  });

  test("registers default handlers", () => {
    registerDefaultJobHandlers();

    assert.deepEqual(listRegisteredJobHandlers(), [
      JOB_NAMES.SYSTEM_PING,
      JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
      JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP,
      JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
      JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN,
    ]);
    assert.equal(typeof resolveJobHandler(JOB_NAMES.SYSTEM_PING), "function");
    assert.equal(
      typeof resolveJobHandler(JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY),
      "function",
    );
  });

  test("rejects invalid handler registration", () => {
    assert.throws(
      () => registerJobHandler("", async () => {}),
      TypeError,
    );

    assert.throws(
      () => registerJobHandler(JOB_NAMES.SYSTEM_PING, null),
      TypeError,
    );
  });

  test("returns undefined for non-string handler lookups", () => {
    assert.equal(resolveJobHandler(undefined), undefined);
    assert.equal(resolveJobHandler(123), undefined);
  });

  test("runs a registered handler and surfaces unknown jobs", async () => {
    registerJobHandler(JOB_NAMES.SYSTEM_PING, async () => ({ ok: true }));

    const run = createJobHandlerRunner();
    const result = await run({
      name: JOB_NAMES.SYSTEM_PING,
      id: "job-1",
      attemptsMade: 0,
    });

    assert.deepEqual(result, { ok: true });

    await assert.rejects(
      () => run({ name: "missing.job", id: "job-2", attemptsMade: 0 }),
      UnknownJobHandlerError,
    );
  });

  test("returns a default success payload when handlers omit a result", async () => {
    registerJobHandler(JOB_NAMES.SYSTEM_PING, async () => undefined);

    const run = createJobHandlerRunner();
    const result = await run({
      name: JOB_NAMES.SYSTEM_PING,
      id: "job-1",
      attemptsMade: 0,
    });

    assert.deepEqual(result, { ok: true });
  });

  test("rethrows handler failures for queue retries", async () => {
    registerJobHandler(JOB_NAMES.SYSTEM_PING, async () => {
      throw new Error("transient failure");
    });

    const logs = [];
    const run = createJobHandlerRunner({
      logger: {
        info(entry) {
          logs.push(entry);
        },
        error(entry) {
          logs.push(entry);
        },
      },
    });

    await assert.rejects(
      () =>
        run({
          name: JOB_NAMES.SYSTEM_PING,
          id: "job-1",
          attemptsMade: 1,
        }),
      /transient failure/,
    );

    assert.equal(logs.some((entry) => entry.event === "job_failed"), true);
  });

  test("logs successful jobs", async () => {
    registerJobHandler(JOB_NAMES.SYSTEM_PING, async () => ({ ok: true }));

    const logs = [];
    const run = createJobHandlerRunner({
      logger: {
        info(entry) {
          logs.push(entry);
        },
        error() {},
      },
    });

    await run({
      name: JOB_NAMES.SYSTEM_PING,
      id: "job-1",
      attemptsMade: 0,
    });

    assert.equal(logs.some((entry) => entry.event === "job_completed"), true);
  });
});
