import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildBuildingFollowersNotifyJobId } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import { getMergeableJobData } from "../modules/building-follow-notify/utils/get-mergeable-job-data.js";
import { normalizeBuildingFollowersNotifyJobData } from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
import { enqueueJob } from "../shared/queue/enqueue.js";
import { clearJobHandlersForTests, registerJobHandler } from "../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";
import { startQueueWorker } from "../shared/queue/run-worker.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

const buildingId = new mongoose.Types.ObjectId().toString();

const jobData = (overrides = {}) =>
  normalizeBuildingFollowersNotifyJobData({
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    buildingId,
    occurredAt: "2026-08-01T10:00:00.000Z",
    listings: [
      {
        listingId: new mongoose.Types.ObjectId().toString(),
        rent: 5500,
        occurredAt: "2026-08-01T10:00:00.000Z",
      },
    ],
    metadata: { buildingName: "Sky Residence" },
    ...overrides,
  });

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: true,
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    prefix: `rental:queue:get-mergeable:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 1,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

const jobIdFor = (id = buildingId) =>
  buildBuildingFollowersNotifyJobId({
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    buildingId: id,
  });

const enqueueDelayedJob = async ({ jobId, data, delayMs = 60_000 }) => {
  await enqueueJob({
    name: JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
    data,
    jobId,
    delayMs,
  });
};

const waitForJobState = async (jobId, expectedState, timeoutMs = 8_000) => {
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

describe("getMergeableJobData", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("returns null without querying the queue", () => {
    test("returns null when the queue is disabled", async () => {
      assert.equal(await getMergeableJobData(jobIdFor()), null);
    });

    test("returns null when jobId is missing", async () => {
      assert.equal(await getMergeableJobData(null), null);
      assert.equal(await getMergeableJobData(undefined), null);
      assert.equal(await getMergeableJobData(""), null);
    });
  });
});

describe(
  "getMergeableJobData integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("returns null when no job exists for the id", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      assert.equal(
        await getMergeableJobData(jobIdFor(new mongoose.Types.ObjectId().toString())),
        null,
      );

      await closeQueueProducer();
    });

    test("returns job data for a delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const payload = jobData();
      const jobId = jobIdFor();

      await enqueueDelayedJob({ jobId, data: payload });

      const mergeable = await getMergeableJobData(jobId);

      assert.deepEqual(mergeable, payload);

      await closeQueueProducer();
    });

    test("returns job data for a waiting job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const payload = jobData();
      const jobId = jobIdFor(new mongoose.Types.ObjectId().toString());

      await enqueueDelayedJob({ jobId, data: payload, delayMs: 0 });

      const job = await waitForJobState(jobId, "waiting");

      assert.ok(job);

      const mergeable = await getMergeableJobData(jobId);

      assert.deepEqual(mergeable, payload);

      await closeQueueProducer();
    });

    test("returns job data for a paused job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const payload = jobData();
      const jobId = jobIdFor(new mongoose.Types.ObjectId().toString());

      await enqueueDelayedJob({ jobId, data: payload, delayMs: 60_000 });
      await getQueue().pause();

      const job = await getQueue().getJob(jobId);

      assert.ok(job);
      assert.equal(await job.getState(), "delayed");

      const mergeable = await getMergeableJobData(jobId);

      assert.deepEqual(mergeable, payload);

      await getQueue().resume();
      await closeQueueProducer();
    });

    test("returns null for a completed job", async () => {
      const queueConfig = createIsolatedQueueConfig();

      registerJobHandler(
        JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        async () => ({ ok: true }),
      );
      await initializeQueueProducer(queueConfig);
      const workerRuntime = await startQueueWorker(queueConfig);

      const payload = jobData();
      const jobId = jobIdFor(new mongoose.Types.ObjectId().toString());

      await enqueueDelayedJob({ jobId, data: payload, delayMs: 0 });

      const completedJob = await waitForJobState(jobId, "completed");

      assert.ok(completedJob);
      assert.equal(await getMergeableJobData(jobId), null);

      await workerRuntime.close();
      await closeQueueProducer();
    });

    test("returns null for a failed job", async () => {
      const queueConfig = createIsolatedQueueConfig();

      registerJobHandler(JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING, async () => {
        throw new Error("handler failed");
      });
      await initializeQueueProducer(queueConfig);
      const workerRuntime = await startQueueWorker(queueConfig);

      const payload = jobData();
      const jobId = jobIdFor(new mongoose.Types.ObjectId().toString());

      await enqueueDelayedJob({ jobId, data: payload, delayMs: 0 });

      const failedJob = await waitForJobState(jobId, "failed");

      assert.ok(failedJob);
      assert.equal(await getMergeableJobData(jobId), null);

      await workerRuntime.close();
      await closeQueueProducer();
    });

    test("returns null for an active job", async () => {
      const queueConfig = createIsolatedQueueConfig();
      let releaseJob;

      registerJobHandler(
        JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        () =>
          new Promise((resolve) => {
            releaseJob = () => resolve({ ok: true });
          }),
      );
      await initializeQueueProducer(queueConfig);
      const workerRuntime = await startQueueWorker(queueConfig);

      const payload = jobData();
      const jobId = jobIdFor(new mongoose.Types.ObjectId().toString());

      await enqueueDelayedJob({ jobId, data: payload, delayMs: 0 });

      const activeJob = await waitForJobState(jobId, "active");

      assert.ok(activeJob);
      assert.equal(await getMergeableJobData(jobId), null);

      releaseJob?.();
      await waitForJobState(jobId, "completed");

      await workerRuntime.close();
      await closeQueueProducer();
    });
  },
);
