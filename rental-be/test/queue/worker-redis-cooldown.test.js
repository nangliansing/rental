import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createWorkerRedisCooldown,
  isRedisWorkerFault,
} from "../../shared/queue/worker-redis-cooldown.js";

const createLogger = () => {
  const entries = [];
  return {
    entries,
    warn: (payload, message) => entries.push(["warn", payload, message]),
    info: (payload, message) => entries.push(["info", payload, message]),
    error: (payload, message) => entries.push(["error", payload, message]),
  };
};

const createWorker = ({
  closing = false,
  pauseImpl,
  resumeImpl,
} = {}) => {
  const calls = [];
  const worker = {
    get closing() {
      return closing;
    },
    setClosing(value) {
      closing = value;
    },
    pause: async (local) => {
      calls.push(["pause", local]);
      if (pauseImpl) {
        return pauseImpl(local);
      }
    },
    resume: async () => {
      calls.push(["resume"]);
      if (resumeImpl) {
        return resumeImpl();
      }
    },
  };

  return { worker, calls };
};

describe("isRedisWorkerFault", () => {
  test("returns false for missing or empty faults", () => {
    assert.equal(isRedisWorkerFault(null), false);
    assert.equal(isRedisWorkerFault(undefined), false);
    assert.equal(isRedisWorkerFault({}), false);
    assert.equal(isRedisWorkerFault({ message: "" }), false);
    assert.equal(isRedisWorkerFault({ message: null }), false);
  });

  test("detects Upstash and connection messages case-insensitively", () => {
    for (const message of [
      "ERR max requests limit exceeded. Limit: 500000, Usage: 500000.",
      "MAX REQUESTS LIMIT EXCEEDED",
      "ECONNREFUSED 127.0.0.1:6379",
      "connect ETIMEDOUT",
      "getaddrinfo ENOTFOUND example.upstash.io",
      "read ECONNRESET",
      "connect ENETUNREACH",
      "READONLY You can't write against a read only replica.",
      "Connection is closed.",
      "NR_CLOSED",
      "Stream isn't writeable and enableOfflineQueue options is false",
      "connection timeout",
    ]) {
      assert.equal(
        isRedisWorkerFault({ message }),
        true,
        `expected fault for message: ${message}`,
      );
    }
  });

  test("detects Redis client error names even when the message is generic", () => {
    assert.equal(
      isRedisWorkerFault({ name: "ReplyError", message: "ERR unknown" }),
      true,
    );
    assert.equal(
      isRedisWorkerFault({ name: "SimpleError", message: "boom" }),
      true,
    );
  });

  test("detects common Node network codes without a matching message", () => {
    assert.equal(
      isRedisWorkerFault({ code: "ECONNRESET", message: "socket hang up" }),
      true,
    );
    assert.equal(
      isRedisWorkerFault({ code: "ECONNREFUSED", message: "connect" }),
      true,
    );
    assert.equal(
      isRedisWorkerFault({ code: "ETIMEDOUT", message: "timeout" }),
      true,
    );
  });

  test("ignores unrelated application and job errors", () => {
    for (const error of [
      { message: "handler boom" },
      { message: "validation failed" },
      { name: "TypeError", message: "Cannot read properties of null" },
      { code: "ENOENT", message: "no such file" },
      new Error("Unknown job handler"),
    ]) {
      assert.equal(
        isRedisWorkerFault(error),
        false,
        `expected non-fault for ${error.message ?? error.code}`,
      );
    }
  });
});

describe("createWorkerRedisCooldown", () => {
  test("requires a worker", () => {
    assert.throws(
      () => createWorkerRedisCooldown({}),
      /createWorkerRedisCooldown requires a worker/,
    );
    assert.throws(
      () => createWorkerRedisCooldown({ worker: null }),
      TypeError,
    );
  });

  test("ignores non-Redis errors and leaves the worker running", async () => {
    const { worker, calls } = createWorker();
    const logger = createLogger();
    const cooldown = createWorkerRedisCooldown({
      worker,
      logger,
      sleep: async () => {
        throw new Error("sleep should not run");
      },
    });

    assert.equal(cooldown.schedule({ message: "job failed" }), null);
    assert.equal(cooldown.schedule(null), null);
    assert.deepEqual(calls, []);
    assert.deepEqual(logger.entries, []);
  });

  test("pauses with local=true, sleeps, resumes, and logs lifecycle events", async () => {
    const { worker, calls } = createWorker();
    const logger = createLogger();
    const sleeps = [];
    const fault = { message: "ERR max requests limit exceeded" };

    const cooldown = createWorkerRedisCooldown({
      worker,
      logger,
      initialDelayMs: 25,
      maxDelayMs: 200,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await cooldown.schedule(fault);

    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
    ]);
    assert.deepEqual(sleeps, [25]);
    assert.equal(logger.entries.length, 2);
    assert.equal(logger.entries[0][0], "warn");
    assert.equal(logger.entries[0][1].event, "queue_worker_redis_cooldown");
    assert.equal(logger.entries[0][1].delayMs, 25);
    assert.equal(logger.entries[0][1].err, fault);
    assert.equal(
      logger.entries[1][0],
      "info",
    );
    assert.equal(
      logger.entries[1][1].event,
      "queue_worker_redis_cooldown_resumed",
    );
    assert.equal(logger.entries[1][1].delayMs, 25);
  });

  test("collapses concurrent schedules into a single in-flight cooldown", async () => {
    const { worker, calls } = createWorker();
    let releaseSleep;
    const sleepGate = new Promise((resolve) => {
      releaseSleep = resolve;
    });
    let sleepStarted = 0;

    const cooldown = createWorkerRedisCooldown({
      worker,
      initialDelayMs: 10,
      maxDelayMs: 40,
      sleep: async () => {
        sleepStarted += 1;
        await sleepGate;
      },
    });

    const first = cooldown.schedule({ message: "Connection is closed." });
    const second = cooldown.schedule({ message: "Connection is closed." });
    const third = cooldown.schedule({
      message: "ERR max requests limit exceeded",
    });

    assert.equal(first, second);
    assert.equal(second, third);

    await Promise.resolve();
    assert.equal(sleepStarted, 1);
    assert.deepEqual(calls, [["pause", true]]);

    releaseSleep();
    await first;

    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
    ]);
    assert.equal(sleepStarted, 1);
  });

  test("exponentially backs off and clamps at maxDelayMs", async () => {
    const { worker } = createWorker();
    const sleeps = [];
    const cooldown = createWorkerRedisCooldown({
      worker,
      initialDelayMs: 10,
      maxDelayMs: 40,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await cooldown.schedule({ message: "ECONNREFUSED" });
    await cooldown.schedule({ message: "ECONNREFUSED" });
    await cooldown.schedule({ message: "ECONNREFUSED" });
    await cooldown.schedule({ message: "ECONNREFUSED" });
    await cooldown.schedule({ message: "ECONNREFUSED" });

    assert.deepEqual(sleeps, [10, 20, 40, 40, 40]);
  });

  test("reset restores the initial backoff after a successful stretch", async () => {
    const { worker } = createWorker();
    const sleeps = [];
    const cooldown = createWorkerRedisCooldown({
      worker,
      initialDelayMs: 10,
      maxDelayMs: 80,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await cooldown.schedule({ code: "ETIMEDOUT", message: "timeout" });
    await cooldown.schedule({ code: "ETIMEDOUT", message: "timeout" });
    assert.deepEqual(sleeps, [10, 20]);

    cooldown.reset();

    await cooldown.schedule({ code: "ETIMEDOUT", message: "timeout" });
    assert.deepEqual(sleeps, [10, 20, 10]);
  });

  test("continues cooldown when pause fails", async () => {
    const pauseError = new Error("pause failed");
    const { worker, calls } = createWorker({
      pauseImpl: async () => {
        throw pauseError;
      },
    });
    const logger = createLogger();
    const sleeps = [];

    const cooldown = createWorkerRedisCooldown({
      worker,
      logger,
      initialDelayMs: 15,
      maxDelayMs: 60,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await cooldown.schedule({ message: "READONLY" });

    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
    ]);
    assert.deepEqual(sleeps, [15]);
    assert.equal(
      logger.entries.some(
        ([level, payload]) =>
          level === "error" && payload.event === "queue_worker_pause_failed",
      ),
      true,
    );
    assert.equal(
      logger.entries.some(
        ([level, payload]) =>
          level === "info" &&
          payload.event === "queue_worker_redis_cooldown_resumed",
      ),
      true,
    );
  });

  test("logs resume failure and clears the in-flight latch", async () => {
    const resumeError = new Error("resume failed");
    const { worker, calls } = createWorker({
      resumeImpl: async () => {
        throw resumeError;
      },
    });
    const logger = createLogger();

    const cooldown = createWorkerRedisCooldown({
      worker,
      logger,
      initialDelayMs: 5,
      maxDelayMs: 20,
      sleep: async () => {},
    });

    await cooldown.schedule({ message: "NR_CLOSED" });

    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
    ]);
    assert.equal(
      logger.entries.some(
        ([level, payload]) =>
          level === "error" && payload.event === "queue_worker_resume_failed",
      ),
      true,
    );
    assert.equal(
      logger.entries.some(
        ([level, payload]) =>
          level === "info" &&
          payload.event === "queue_worker_redis_cooldown_resumed",
      ),
      false,
    );

    // In-flight latch must clear so a later fault can schedule again.
    const second = cooldown.schedule({ message: "NR_CLOSED" });
    assert.notEqual(second, null);
    await second;
    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
      ["pause", true],
      ["resume"],
    ]);
  });

  test("skips resume when the worker is already closing", async () => {
    const { worker, calls } = createWorker({ closing: true });
    const logger = createLogger();

    const cooldown = createWorkerRedisCooldown({
      worker,
      logger,
      initialDelayMs: 5,
      maxDelayMs: 20,
      sleep: async () => {},
    });

    await cooldown.schedule({ message: "Connection is closed." });

    assert.deepEqual(calls, [["pause", true]]);
    assert.equal(
      logger.entries.some(
        ([level, payload]) =>
          level === "info" &&
          payload.event === "queue_worker_redis_cooldown_resumed",
      ),
      false,
    );
  });

  test("observes closing that flips during sleep", async () => {
    const { worker, calls } = createWorker({ closing: false });

    const cooldown = createWorkerRedisCooldown({
      worker,
      initialDelayMs: 5,
      maxDelayMs: 20,
      sleep: async () => {
        worker.setClosing(true);
      },
    });

    await cooldown.schedule({ name: "ReplyError", message: "oops" });

    assert.deepEqual(calls, [["pause", true]]);
  });

  test("works without a logger", async () => {
    const { worker, calls } = createWorker();
    const cooldown = createWorkerRedisCooldown({
      worker,
      initialDelayMs: 5,
      maxDelayMs: 20,
      sleep: async () => {},
    });

    await assert.doesNotReject(() =>
      cooldown.schedule({ message: "max requests limit exceeded" }),
    );
    assert.deepEqual(calls, [
      ["pause", true],
      ["resume"],
    ]);
  });

  test("uses default delay bounds when options omit them", async () => {
    const { worker } = createWorker();
    const sleeps = [];
    const cooldown = createWorkerRedisCooldown({
      worker,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await cooldown.schedule({ message: "connection timeout" });
    assert.deepEqual(sleeps, [1_000]);
  });
});
