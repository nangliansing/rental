import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { prepareBuildingFollowersNotifyJobData } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { buildBuildingFollowersNotifyJobId } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
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

const buildingObjectId = new mongoose.Types.ObjectId();
const buildingId = buildingObjectId.toString();

const newListingPayload = (overrides = {}) => ({
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

const priceDropPayload = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
  buildingId,
  occurredAt: "2026-08-01T10:00:00.000Z",
  metadata: {
    buildingName: "Sky Residence",
    oldMinRent: 7000,
    newMinRent: 6500,
  },
  ...overrides,
});

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: true,
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    prefix: `rental:queue:prepare-job-data:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 3,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

const jobIdFor = (changeType, id = buildingId) =>
  buildBuildingFollowersNotifyJobId({ changeType, buildingId: id });

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

describe("prepareBuildingFollowersNotifyJobData", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("rejects invalid input", () => {
    test("returns null for null or undefined payloads", async () => {
      assert.equal(await prepareBuildingFollowersNotifyJobData(null), null);
      assert.equal(await prepareBuildingFollowersNotifyJobData(undefined), null);
    });

    test("returns null for non-object payloads", async () => {
      assert.equal(await prepareBuildingFollowersNotifyJobData("payload"), null);
    });
  });

  describe("when no mergeable job exists", () => {
    test("returns normalized incoming data for new listing payloads", async () => {
      const raw = newListingPayload({
        buildingId: buildingObjectId,
      });

      const prepared = await prepareBuildingFollowersNotifyJobData(raw);

      assert.deepEqual(prepared, normalizeBuildingFollowersNotifyJobData(raw));
    });

    test("returns normalized incoming data for price drop payloads", async () => {
      const raw = priceDropPayload();

      const prepared = await prepareBuildingFollowersNotifyJobData(raw);

      assert.deepEqual(prepared, normalizeBuildingFollowersNotifyJobData(raw));
      assert.deepEqual(prepared.listings, []);
    });

    test("accepts already-normalized payloads", async () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(newListingPayload());

      const prepared = await prepareBuildingFollowersNotifyJobData(normalized);

      assert.deepEqual(prepared, normalized);
    });
  });
});

describe(
  "prepareBuildingFollowersNotifyJobData integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("returns normalized incoming data when the queue has no matching job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const raw = newListingPayload();
      const prepared = await prepareBuildingFollowersNotifyJobData(raw);

      assert.deepEqual(prepared, normalizeBuildingFollowersNotifyJobData(raw));

      await closeQueueProducer();
    });

    test("merges incoming listings into an existing delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const listingA = new mongoose.Types.ObjectId().toString();
      const listingB = new mongoose.Types.ObjectId().toString();

      const firstPayload = await prepareBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:00:00.000Z",
        listings: [
          {
            listingId: listingA,
            rent: 5000,
            occurredAt: "2026-08-01T10:00:00.000Z",
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      });

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        data: firstPayload,
        jobId: jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING, targetBuildingId),
        delayMs: 60_000,
      });

      const mergedPayload = await prepareBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:05:00.000Z",
        listings: [
          {
            listingId: listingB,
            rent: 5200,
            occurredAt: "2026-08-01T10:05:00.000Z",
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      });

      assert.equal(mergedPayload.listings.length, 2);
      assert.equal(mergedPayload.occurredAt, "2026-08-01T10:05:00.000Z");
      assert.deepEqual(
        mergedPayload.listings.map((entry) => entry.listingId).sort(),
        [listingA, listingB].sort(),
      );

      await closeQueueProducer();
    });

    test("merges price drops by keeping the lowest newMinRent", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const jobId = jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED, targetBuildingId);

      const firstPayload = await prepareBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:00:00.000Z",
        metadata: {
          buildingName: "Merge Tower",
          oldMinRent: 7000,
          newMinRent: 6500,
        },
      });

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP,
        data: firstPayload,
        jobId,
        delayMs: 60_000,
      });

      const mergedPayload = await prepareBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:05:00.000Z",
        metadata: {
          buildingName: "Merge Tower",
          oldMinRent: 7000,
          newMinRent: 5500,
        },
      });

      assert.equal(mergedPayload.metadata.oldMinRent, 7000);
      assert.equal(mergedPayload.metadata.newMinRent, 5500);
      assert.equal(mergedPayload.occurredAt, "2026-08-01T10:05:00.000Z");
      assert.deepEqual(mergedPayload.listings, []);

      await closeQueueProducer();
    });

    test("does not merge when the existing job is no longer updatable", async () => {
      const queueConfig = createIsolatedQueueConfig();

      registerJobHandler(
        JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        async () => ({ ok: true }),
      );
      await initializeQueueProducer(queueConfig);
      const workerRuntime = await startQueueWorker(queueConfig);

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const listingA = new mongoose.Types.ObjectId().toString();
      const listingB = new mongoose.Types.ObjectId().toString();
      const jobId = jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING, targetBuildingId);

      const existingPayload = await prepareBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:00:00.000Z",
        listings: [
          {
            listingId: listingA,
            rent: 5000,
            occurredAt: "2026-08-01T10:00:00.000Z",
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      });

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        data: existingPayload,
        jobId,
        delayMs: 0,
      });

      const completedJob = await waitForJobState(jobId, "completed");

      assert.ok(completedJob);

      const incoming = {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: "2026-08-01T10:05:00.000Z",
        listings: [
          {
            listingId: listingB,
            rent: 5200,
            occurredAt: "2026-08-01T10:05:00.000Z",
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      };

      const prepared = await prepareBuildingFollowersNotifyJobData(incoming);

      assert.deepEqual(prepared, normalizeBuildingFollowersNotifyJobData(incoming));
      assert.equal(prepared.listings.length, 1);
      assert.equal(prepared.listings[0].listingId, listingB);

      await workerRuntime.close();
      await closeQueueProducer();
    });
  },
);
