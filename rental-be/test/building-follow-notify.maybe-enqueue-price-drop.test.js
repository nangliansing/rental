import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { maybeEnqueueBuildingFollowerPriceDrop } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
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

const buildingId = new mongoose.Types.ObjectId();
const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: true,
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    prefix: `rental:queue:price-drop-enqueue:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 3,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

const priceDropJobId = (id = buildingId) =>
  `building.followers.notify-${id.toString()}-PRICE_DROPPED`;

describe("maybeEnqueueBuildingFollowerPriceDrop", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("returns no_change without touching the queue", () => {
    test("rejects calls with no meaningful price drop", async () => {
      const cases = [
        {
          label: "no arguments",
          input: undefined,
        },
        {
          label: "unchanged rent",
          input: {
            buildingId,
            oldMinRent: 6000,
            newMinRent: 6000,
          },
        },
        {
          label: "increased rent",
          input: {
            buildingId,
            oldMinRent: 6000,
            newMinRent: 6500,
          },
        },
        {
          label: "drop below threshold",
          input: {
            buildingId,
            oldMinRent: 6000,
            newMinRent: 5999,
          },
        },
        {
          label: "invalid rents",
          input: {
            buildingId,
            oldMinRent: null,
            newMinRent: 5500,
          },
        },
      ];

      for (const { label, input } of cases) {
        const result = await maybeEnqueueBuildingFollowerPriceDrop(input);

        assert.deepEqual(
          result,
          { enqueued: false, reason: "no_change" },
          `expected no_change for ${label}`,
        );
      }
    });

    test("does not log when no price drop is detected", async () => {
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId,
        oldMinRent: 6000,
        newMinRent: 6500,
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(result.reason, "no_change");
      assert.equal(logs.length, 0);
    });
  });

  describe("when the queue is disabled", () => {
    test("returns disabled for a valid price drop", async () => {
      const result = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId,
        buildingName: "Tower",
        oldMinRent: 7000,
        newMinRent: 5500,
      });

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
    });

    test("logs the enqueue attempt when a logger is provided", async () => {
      const logs = [];

      await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId,
        buildingName: "Tower",
        oldMinRent: 7000,
        newMinRent: 5500,
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.event, "building_followers_notify_enqueued");
      assert.equal(logs[0]?.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED);
      assert.equal(logs[0]?.buildingId, buildingId.toString());
      assert.equal(logs[0]?.listingCount, 0);
      assert.equal(logs[0]?.enqueued, false);
      assert.equal(logs[0]?.reason, "disabled");
    });
  });
});

describe(
  "maybeEnqueueBuildingFollowerPriceDrop integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("enqueues a delayed price-drop job with the expected payload", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId: targetBuildingId,
        buildingName: "Harbor View",
        oldMinRent: 7000,
        newMinRent: 5500,
        occurredAt: OCCURRED_AT,
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(result.enqueued, true);
      assert.equal(result.updated, false);
      assert.equal(result.listingCount, 0);
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP);
      assert.equal(result.delayMs, BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS);

      const job = await getQueue().getJob(priceDropJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(await job.getState(), "delayed");
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP);
      assert.equal(job.data.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED);
      assert.equal(job.data.buildingId, targetBuildingId.toString());
      assert.equal(job.data.occurredAt, OCCURRED_AT.toISOString());
      assert.equal(job.data.metadata.buildingName, "Harbor View");
      assert.equal(job.data.metadata.oldMinRent, 7000);
      assert.equal(job.data.metadata.newMinRent, 5500);
      assert.deepEqual(job.data.listings, []);

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.enqueued, true);

      await closeQueueProducer();
    });

    test("merges a second price drop into the existing delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();

      const first = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId: targetBuildingId,
        buildingName: "Merge Tower",
        oldMinRent: 7000,
        newMinRent: 6500,
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      const second = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId: targetBuildingId,
        buildingName: "Merge Tower",
        oldMinRent: 7000,
        newMinRent: 5500,
        occurredAt: new Date("2026-08-01T10:05:00.000Z"),
      });

      assert.equal(first.enqueued, true);
      assert.equal(first.updated, false);
      assert.equal(second.enqueued, true);
      assert.equal(second.updated, true);

      const job = await getQueue().getJob(priceDropJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(job.data.metadata.oldMinRent, 7000);
      assert.equal(job.data.metadata.newMinRent, 5500);
      assert.equal(job.data.occurredAt, "2026-08-01T10:05:00.000Z");

      await closeQueueProducer();
    });

    test("accepts string buildingId values", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();

      const result = await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId: targetBuildingId.toString(),
        buildingName: "String Id Tower",
        oldMinRent: 7000,
        newMinRent: 5500,
      });

      assert.equal(result.enqueued, true);

      const job = await getQueue().getJob(priceDropJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(job.data.buildingId, targetBuildingId.toString());

      await closeQueueProducer();
    });
  },
);
