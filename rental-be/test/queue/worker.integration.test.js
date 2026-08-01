import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { validateEnvironment } from "../../config/environment.js";
import { JOB_NAMES } from "../../shared/queue/constants.js";
import { enqueueJob } from "../../shared/queue/enqueue.js";
import { registerDefaultJobHandlers } from "../../shared/queue/handlers/index.js";
import {
  clearJobHandlersForTests,
  registerJobHandler,
} from "../../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../../shared/queue/queue-manager.js";
import {
  createRealtimePublisher,
  createRealtimeSubscriber,
} from "../../shared/queue/pubsub/realtime-hints.js";
import { startQueueWorker } from "../../shared/queue/run-worker.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

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
  QUEUE_ENABLED: "true",
  REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  ...overrides,
});

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return validateEnvironment(
    validEnvironment({
      QUEUE_PREFIX: `rental:queue:test:${suffix}`,
    }),
  ).queue;
};

const waitForJobState = async (jobId, expectedState, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getQueue().getJob(jobId);
    if (job && (await job.getState()) === expectedState) {
      if (expectedState === "completed" && job.returnvalue == null) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
};

const createWorkerRuntime = async (queueConfig) => {
  await initializeQueueProducer(queueConfig);
  const workerRuntime = await startQueueWorker(queueConfig);

  return {
    ...workerRuntime,
    close: async () => {
      await workerRuntime.close();
      await closeQueueProducer();
    },
  };
};

describe("queue worker integration", { skip: !shouldRunIntegration }, () => {
  beforeEach(async () => {
    clearJobHandlersForTests();
    await resetQueueStateForTests();
  });

  afterEach(async () => {
    clearJobHandlersForTests();
    await resetQueueStateForTests();
  });

  test("processes a system.ping job end to end", async () => {
    const queueConfig = createIsolatedQueueConfig();
    registerDefaultJobHandlers();
    const workerRuntime = await createWorkerRuntime(queueConfig);

    try {
      const jobId = `system.ping-${Date.now()}`;
      const enqueueResult = await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message: "integration ping" },
        jobId,
      });

      assert.equal(enqueueResult.enqueued, true);

      const job = await waitForJobState(jobId, "completed");
      assert.ok(job, "Expected the worker to complete the ping job");

      const result = job.returnvalue;
      assert.equal(result.ok, true);
      assert.equal(result.message, "integration ping");
    } finally {
      await workerRuntime.close();
    }
  });

  test("deduplicates delayed jobs that share the same job id", async () => {
    const queueConfig = createIsolatedQueueConfig();

    registerJobHandler(JOB_NAMES.SYSTEM_PING, async (job) => ({
      ok: true,
      message: job.data.message,
    }));

    const workerRuntime = await createWorkerRuntime(queueConfig);
    const jobId = `system.ping-dedupe-${Date.now()}`;

    try {
      await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message: "first" },
        jobId,
        delayMs: 5000,
      });

      await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message: "second" },
        jobId,
        delayMs: 5000,
      });

      const pendingJob = await getQueue().getJob(jobId);
      assert.ok(pendingJob, "Expected delayed job to exist");
      assert.equal(await pendingJob.getState(), "delayed");
      assert.equal(pendingJob.data.message, "second");
    } finally {
      await workerRuntime.close();
    }
  });

  test("re-enqueues after a completed job with the same job id", async () => {
    const queueConfig = createIsolatedQueueConfig();
    registerDefaultJobHandlers();
    const workerRuntime = await createWorkerRuntime(queueConfig);
    const jobId = `system.ping-requeue-${Date.now()}`;

    try {
      await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message: "first" },
        jobId,
        delayMs: 0,
      });

      const completedJob = await waitForJobState(jobId, "completed");
      assert.ok(completedJob, "Expected first job to complete");

      const secondEnqueue = await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: { message: "second" },
        jobId,
        delayMs: 5000,
      });

      assert.equal(secondEnqueue.enqueued, true);
      assert.equal(secondEnqueue.updated, false);

      const pendingJob = await getQueue().getJob(jobId);
      assert.ok(pendingJob);
      assert.equal(await pendingJob.getState(), "delayed");
      assert.equal(pendingJob.data.message, "second");
    } finally {
      await workerRuntime.close();
    }
  });

  test("marks unknown jobs as failed without retry storms", async () => {
    const queueConfig = createIsolatedQueueConfig();
    registerDefaultJobHandlers();
    const workerRuntime = await createWorkerRuntime(queueConfig);
    const jobId = `missing.job-${Date.now()}`;

    try {
      const queue = getQueue();
      await queue.add("missing.job", { example: true }, { jobId, attempts: 3 });

      const job = await waitForJobState(jobId, "failed", 10000);
      assert.ok(job, "Expected unknown job to fail");
      assert.equal(job.attemptsMade, 1);
      assert.match(String(job.failedReason), /No handler registered/);
    } finally {
      await workerRuntime.close();
    }
  });

  test("retries handlers that throw transient errors", async () => {
    const queueConfig = createIsolatedQueueConfig();
    let attempts = 0;

    registerJobHandler(JOB_NAMES.SYSTEM_PING, async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("temporary outage");
      }

      return { ok: true, attempts };
    });

    await initializeQueueProducer({
      ...queueConfig,
      defaultAttempts: 3,
      backoffDelayMs: 100,
    });
    const workerRuntime = await startQueueWorker(queueConfig);
    const jobId = `system.ping-retry-${Date.now()}`;

    try {
      await enqueueJob({
        name: JOB_NAMES.SYSTEM_PING,
        data: {},
        jobId,
        attempts: 3,
      });

      const job = await waitForJobState(jobId, "completed", 10000);
      assert.ok(job, "Expected retried job to eventually complete");
      assert.equal(job.returnvalue.attempts, 2);
      assert.equal(attempts, 2);
    } finally {
      await workerRuntime.close();
      await closeQueueProducer();
    }
  });

  test("delivers realtime hints from worker to subscriber", async () => {
    const queueConfig = createIsolatedQueueConfig();
    const received = [];

    const publisher = await createRealtimePublisher(queueConfig);
    const subscriber = await createRealtimeSubscriber(queueConfig, {
      onHint: (hint) => {
        received.push(hint);
      },
    });

    try {
      await publisher.publish({
        userId: "user-1",
        notificationId: "notif-1",
      });

      const deadline = Date.now() + 3000;
      while (Date.now() < deadline && received.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      assert.deepEqual(received, [
        { userId: "user-1", notificationId: "notif-1" },
      ]);
    } finally {
      await subscriber.close();
      await publisher.close();
    }
  });
});
