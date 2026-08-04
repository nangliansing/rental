import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EnvironmentValidationError,
  validateEnvironment,
} from "../../config/environment.js";
import {
  resolveQueueWorkerOptions,
  resolveWorkerRedisCooldownOptions,
  startQueueWorker,
} from "../../shared/queue/run-worker.js";

const validEnvironment = (overrides = {}) => ({
  NODE_ENV: "development",
  PORT: "3000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/rental_test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  JWT_ACCESS_EXPIRES_IN: "15m",
  GOOGLE_CLIENT_IDS:
    "1060222059887-exampleclient.apps.googleusercontent.com",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  ...overrides,
});

const expectIssues = (overrides, expectedIssues) => {
  assert.throws(
    () => validateEnvironment(validEnvironment(overrides)),
    (error) => {
      assert.ok(error instanceof EnvironmentValidationError);

      for (const expectedIssue of expectedIssues) {
        assert.ok(
          error.issues.includes(expectedIssue),
          `missing issue: ${expectedIssue}; got: ${error.issues.join(" | ")}`,
        );
      }

      return true;
    },
  );
};

describe("resolveQueueWorkerOptions", () => {
  test("defaults drainDelay to 30 seconds", () => {
    assert.deepEqual(resolveQueueWorkerOptions({}), {
      prefix: undefined,
      concurrency: undefined,
      drainDelay: 30,
    });
  });

  test("forwards configured prefix, concurrency, and drain delay", () => {
    assert.deepEqual(
      resolveQueueWorkerOptions({
        prefix: "rental:queue",
        workerConcurrency: 5,
        workerDrainDelaySeconds: 60,
      }),
      {
        prefix: "rental:queue",
        concurrency: 5,
        drainDelay: 60,
      },
    );
  });

  test("treats only nullish drain delay as missing (0 is invalid upstream)", () => {
    assert.equal(
      resolveQueueWorkerOptions({ workerDrainDelaySeconds: undefined }).drainDelay,
      30,
    );
    assert.equal(
      resolveQueueWorkerOptions({ workerDrainDelaySeconds: null }).drainDelay,
      30,
    );
    assert.equal(
      resolveQueueWorkerOptions({ workerDrainDelaySeconds: 45 }).drainDelay,
      45,
    );
  });

  test("supports the configured upper bound used in production tuning", () => {
    assert.equal(
      resolveQueueWorkerOptions({ workerDrainDelaySeconds: 120 }).drainDelay,
      120,
    );
  });
});

describe("resolveWorkerRedisCooldownOptions", () => {
  test("defaults to 1s initial and 60s max cooldown", () => {
    assert.deepEqual(resolveWorkerRedisCooldownOptions({}), {
      initialDelayMs: 1_000,
      maxDelayMs: 60_000,
    });
  });

  test("forwards configured cooldown bounds", () => {
    assert.deepEqual(
      resolveWorkerRedisCooldownOptions({
        workerRedisCooldownInitialMs: 2_000,
        workerRedisCooldownMaxMs: 120_000,
      }),
      {
        initialDelayMs: 2_000,
        maxDelayMs: 120_000,
      },
    );
  });
});

describe("queue worker drain-delay environment wiring", () => {
  test("defaults drain delay and cooldown when unset", () => {
    const config = validateEnvironment(validEnvironment());

    assert.equal(config.queue.workerDrainDelaySeconds, 30);
    assert.equal(config.queue.workerRedisCooldownInitialMs, 1_000);
    assert.equal(config.queue.workerRedisCooldownMaxMs, 60_000);

    assert.deepEqual(resolveQueueWorkerOptions(config.queue), {
      prefix: "rental:queue",
      concurrency: 5,
      drainDelay: 30,
    });
  });

  test("accepts custom drain delay and cooldown values within bounds", () => {
    const config = validateEnvironment(
      validEnvironment({
        QUEUE_WORKER_DRAIN_DELAY_SECONDS: "60",
        QUEUE_WORKER_REDIS_COOLDOWN_INITIAL_MS: "250",
        QUEUE_WORKER_REDIS_COOLDOWN_MAX_MS: "300000",
        WORKER_CONCURRENCY: "3",
      }),
    );

    assert.equal(config.queue.workerDrainDelaySeconds, 60);
    assert.equal(config.queue.workerRedisCooldownInitialMs, 250);
    assert.equal(config.queue.workerRedisCooldownMaxMs, 300_000);
    assert.equal(config.queue.workerConcurrency, 3);

    assert.deepEqual(resolveQueueWorkerOptions(config.queue), {
      prefix: "rental:queue",
      concurrency: 3,
      drainDelay: 60,
    });
    assert.deepEqual(resolveWorkerRedisCooldownOptions(config.queue), {
      initialDelayMs: 250,
      maxDelayMs: 300_000,
    });
  });

  test("accepts the configured min and max drain-delay bounds", () => {
    const minConfig = validateEnvironment(
      validEnvironment({ QUEUE_WORKER_DRAIN_DELAY_SECONDS: "5" }),
    );
    const maxConfig = validateEnvironment(
      validEnvironment({ QUEUE_WORKER_DRAIN_DELAY_SECONDS: "120" }),
    );

    assert.equal(minConfig.queue.workerDrainDelaySeconds, 5);
    assert.equal(maxConfig.queue.workerDrainDelaySeconds, 120);
    assert.equal(resolveQueueWorkerOptions(minConfig.queue).drainDelay, 5);
    assert.equal(resolveQueueWorkerOptions(maxConfig.queue).drainDelay, 120);
  });

  test("rejects drain delay below the minimum", () => {
    expectIssues(
      { QUEUE_WORKER_DRAIN_DELAY_SECONDS: "4" },
      [
        "QUEUE_WORKER_DRAIN_DELAY_SECONDS must be an integer between 5 and 120",
      ],
    );
  });

  test("rejects drain delay above the maximum", () => {
    expectIssues(
      { QUEUE_WORKER_DRAIN_DELAY_SECONDS: "121" },
      [
        "QUEUE_WORKER_DRAIN_DELAY_SECONDS must be an integer between 5 and 120",
      ],
    );
  });

  test("rejects non-integer drain delay values", () => {
    expectIssues(
      { QUEUE_WORKER_DRAIN_DELAY_SECONDS: "30.5" },
      [
        "QUEUE_WORKER_DRAIN_DELAY_SECONDS must be an integer between 5 and 120",
      ],
    );
    expectIssues(
      { QUEUE_WORKER_DRAIN_DELAY_SECONDS: "abc" },
      [
        "QUEUE_WORKER_DRAIN_DELAY_SECONDS must be an integer between 5 and 120",
      ],
    );
  });

  test("rejects invalid redis cooldown bounds", () => {
    expectIssues(
      { QUEUE_WORKER_REDIS_COOLDOWN_INITIAL_MS: "100" },
      [
        "QUEUE_WORKER_REDIS_COOLDOWN_INITIAL_MS must be an integer between 250 and 60000",
      ],
    );
    expectIssues(
      { QUEUE_WORKER_REDIS_COOLDOWN_MAX_MS: "500" },
      [
        "QUEUE_WORKER_REDIS_COOLDOWN_MAX_MS must be an integer between 1000 and 300000",
      ],
    );
  });

  test("resolved options match production env defaults end-to-end", () => {
    const config = validateEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example.com",
        TRUST_PROXY_HOPS: "1",
        RATE_LIMIT_STORE: "redis",
        REDIS_URL: "redis://127.0.0.1:6379",
        METRICS_TOKEN: "metrics-token-with-at-least-32-characters",
        GOOGLE_MAPS_API_KEY: "production-geocode-key",
      }),
    );

    assert.equal(config.queue.enabled, true);
    assert.deepEqual(resolveQueueWorkerOptions(config.queue), {
      prefix: "rental:queue",
      concurrency: 5,
      drainDelay: 30,
    });
    assert.deepEqual(resolveWorkerRedisCooldownOptions(config.queue), {
      initialDelayMs: 1_000,
      maxDelayMs: 60_000,
    });
  });
});

describe("startQueueWorker drain-delay guard", () => {
  test("still refuses to start when the queue is disabled", async () => {
    await assert.rejects(
      () =>
        startQueueWorker({
          enabled: false,
          workerDrainDelaySeconds: 60,
        }),
      /QUEUE_ENABLED=false/,
    );
  });
});
