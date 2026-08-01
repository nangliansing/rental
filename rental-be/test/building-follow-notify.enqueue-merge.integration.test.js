import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import { JOB_NAMES } from "../shared/queue/constants.js";
import { prepareBuildingFollowersNotifyJobData } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { enqueueJob } from "../shared/queue/enqueue.js";
import { registerDefaultJobHandlers } from "../shared/queue/handlers/index.js";
import {
  clearJobHandlersForTests,
} from "../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: true,
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    prefix: `rental:queue:merge-test:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 3,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

describe(
  "building follower notify enqueue merge integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("merges multiple listing events into one delayed job", async () => {
      const queueConfig = createIsolatedQueueConfig();
      await initializeQueueProducer(queueConfig);
      registerDefaultJobHandlers();

      const buildingId = new mongoose.Types.ObjectId().toString();
      const listingIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      for (const [index, listingId] of listingIds.entries()) {
        const payload = await prepareBuildingFollowersNotifyJobData({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId,
          occurredAt: `2026-08-01T10:0${index}:00.000Z`,
          listings: [
            {
              listingId,
              rent: 5000 + index * 100,
              occurredAt: `2026-08-01T10:0${index}:00.000Z`,
            },
          ],
          metadata: { buildingName: "Merge Tower" },
        });

        await enqueueJob({
          name: JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
          data: payload,
          jobId: `building.followers.notify-${buildingId}-NEW_LISTING`,
          delayMs: 60_000,
        });
      }

      const job = await getQueue().getJob(
        `building.followers.notify-${buildingId}-NEW_LISTING`,
      );

      assert.ok(job);
      assert.equal(job.data.listings.length, 3);
      assert.deepEqual(
        job.data.listings.map((listing) => listing.listingId).sort(),
        [...listingIds].sort(),
      );

      await closeQueueProducer();
    });
  },
);
