import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  JOB_NAMES,
  MAX_JOB_DELAY_MS,
  MAX_JOB_ID_LENGTH,
  MAX_JOB_PRIORITY,
} from "../../shared/queue/constants.js";
import { JobValidationError } from "../../shared/queue/errors.js";
import { validateEnqueueOptions } from "../../shared/queue/validate-enqueue-options.js";

const validPayload = (overrides = {}) => ({
  name: JOB_NAMES.SYSTEM_PING,
  data: { message: "hello" },
  ...overrides,
});

describe("validateEnqueueOptions", () => {
  test("accepts a minimal valid payload", () => {
    const validated = validateEnqueueOptions(validPayload());

    assert.equal(validated.name, JOB_NAMES.SYSTEM_PING);
    assert.deepEqual(validated.data, { message: "hello" });
    assert.equal(validated.jobId, undefined);
  });

  test("trims job names and ids", () => {
    const validated = validateEnqueueOptions(
      validPayload({
        name: "  system.ping  ",
        jobId: "  system.ping-test  ",
      }),
    );

    assert.equal(validated.name, JOB_NAMES.SYSTEM_PING);
    assert.equal(validated.jobId, "system.ping-test");
  });

  test("rejects invalid job names", () => {
    for (const name of [
      "",
      "   ",
      "INVALID",
      "System.Ping",
      "system",
      "system.",
      ".ping",
      "system..ping",
      123,
      null,
    ]) {
      assert.throws(
        () => validateEnqueueOptions(validPayload({ name })),
        JobValidationError,
        `Expected rejection for job name ${String(name)}`,
      );
    }
  });

  test("rejects non-plain job data", () => {
    for (const data of [null, undefined, [], "hello", new Date(), new Map()]) {
      assert.throws(
        () => validateEnqueueOptions(validPayload({ data })),
        JobValidationError,
        `Expected rejection for data ${String(data)}`,
      );
    }
  });

  test("accepts an empty plain object payload", () => {
    const validated = validateEnqueueOptions(validPayload({ data: {} }));
    assert.deepEqual(validated.data, {});
  });

  test("rejects unsupported job id characters", () => {
    assert.throws(
      () => validateEnqueueOptions(validPayload({ jobId: "system.ping:test" })),
      /Job id must use letters, numbers, dots, underscores, or hyphens/,
    );
  });

  test("rejects invalid job ids", () => {
    assert.throws(
      () => validateEnqueueOptions(validPayload({ jobId: "" })),
      /Job id must be a non-empty string/,
    );

    assert.throws(
      () => validateEnqueueOptions(validPayload({ jobId: "   " })),
      /Job id must be a non-empty string/,
    );

    assert.throws(
      () =>
        validateEnqueueOptions(
          validPayload({ jobId: "x".repeat(MAX_JOB_ID_LENGTH + 1) }),
        ),
      /Job id must be at most/,
    );

    assert.throws(
      () =>
        validateEnqueueOptions(
          validPayload({
            jobId: ` ${"x".repeat(MAX_JOB_ID_LENGTH + 1)} `,
          }),
        ),
      /Job id must be at most/,
    );
  });

  test("validates delay boundaries", () => {
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ delayMs: 0 })),
    );
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ delayMs: MAX_JOB_DELAY_MS })),
    );

    for (const delayMs of [-1, 1.5, MAX_JOB_DELAY_MS + 1, Number.NaN]) {
      assert.throws(
        () => validateEnqueueOptions(validPayload({ delayMs })),
        /Job delay must be an integer/,
      );
    }
  });

  test("validates priority boundaries", () => {
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ priority: 1 })),
    );
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ priority: MAX_JOB_PRIORITY })),
    );

    for (const priority of [0, MAX_JOB_PRIORITY + 1, 1.5]) {
      assert.throws(
        () => validateEnqueueOptions(validPayload({ priority })),
        /Job priority must be an integer/,
      );
    }
  });

  test("validates attempt boundaries", () => {
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ attempts: 1 })),
    );
    assert.doesNotThrow(() =>
      validateEnqueueOptions(validPayload({ attempts: 10 })),
    );

    for (const attempts of [0, 11, 2.5]) {
      assert.throws(
        () => validateEnqueueOptions(validPayload({ attempts })),
        /Job attempts must be an integer/,
      );
    }
  });
});
