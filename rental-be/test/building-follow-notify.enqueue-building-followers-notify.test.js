import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { enqueueBuildingFollowersNotify } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { buildBuildingFollowersNotifyJobId } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import { AppError } from "../shared/errors/app-error.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
import { clearJobHandlersForTests } from "../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

const buildingObjectId = new mongoose.Types.ObjectId();
const buildingId = buildingObjectId.toString();
const listingObjectId = new mongoose.Types.ObjectId();
const listingId = listingObjectId.toString();
const excludeObjectId = new mongoose.Types.ObjectId();
const excludeUserId = excludeObjectId.toString();
const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const newListingEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId,
  occurredAt: OCCURRED_AT,
  listings: [
    {
      listingId,
      rent: 5500,
      occurredAt: OCCURRED_AT,
      excludeUserId,
    },
  ],
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

const priceDropEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
  buildingId,
  occurredAt: OCCURRED_AT,
  metadata: {
    buildingName: "Sky Residence",
    oldMinRent: 7000,
    newMinRent: 6500,
  },
  ...overrides,
});

const availableAgainEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
  buildingId,
  occurredAt: OCCURRED_AT,
  listings: [
    {
      listingId,
      rent: 5500,
      occurredAt: OCCURRED_AT,
      availabilityChanged: true,
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
    prefix: `rental:queue:enqueue-notify:${suffix}`,
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

describe("enqueueBuildingFollowersNotify", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("rejects invalid input", () => {
    test("throws when the event payload is missing", async () => {
      await assert.rejects(
        () => enqueueBuildingFollowersNotify(null),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });

    test("throws when listing-specific events have no listings", async () => {
      await assert.rejects(
        () =>
          enqueueBuildingFollowersNotify({
            changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
            buildingId,
            metadata: { buildingName: "Sky Residence" },
          }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });

    test("throws when price-drop metadata is incomplete", async () => {
      await assert.rejects(
        () =>
          enqueueBuildingFollowersNotify({
            changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
            buildingId,
            metadata: {
              buildingName: "Sky Residence",
              oldMinRent: 7000,
            },
          }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });

    test("throws when delayMs is invalid", async () => {
      await assert.rejects(
        () => enqueueBuildingFollowersNotify(newListingEvent(), { delayMs: -1 }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );

      await assert.rejects(
        () => enqueueBuildingFollowersNotify(newListingEvent(), { delayMs: 1.5 }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });
  });

  describe("when the queue is disabled", () => {
    test("returns disabled for a new-listing event with listingCount", async () => {
      const result = await enqueueBuildingFollowersNotify(newListingEvent());

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING);
      assert.equal(result.listingCount, 1);
    });

    test("returns disabled for a price-drop event with zero listings", async () => {
      const result = await enqueueBuildingFollowersNotify(priceDropEvent());

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP);
      assert.equal(result.listingCount, 0);
    });

    test("logs the enqueue attempt when a logger is provided", async () => {
      const logs = [];

      await enqueueBuildingFollowersNotify(newListingEvent(), {
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.event, "building_followers_notify_enqueued");
      assert.equal(logs[0]?.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(logs[0]?.buildingId, buildingId);
      assert.equal(logs[0]?.listingCount, 1);
      assert.equal(logs[0]?.enqueued, false);
      assert.equal(logs[0]?.reason, "disabled");
    });
  });
});

describe(
  "enqueueBuildingFollowersNotify integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("enqueues a delayed new-listing job with the expected payload", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const targetListingId = new mongoose.Types.ObjectId().toString();
      const targetExcludeId = new mongoose.Types.ObjectId().toString();
      const logs = [];

      const result = await enqueueBuildingFollowersNotify(
        {
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId: targetBuildingId,
          occurredAt: OCCURRED_AT,
          excludeUserIds: [targetExcludeId],
          listings: [
            {
              listingId: targetListingId,
              rent: 5200,
              occurredAt: OCCURRED_AT,
              excludeUserId: targetExcludeId,
            },
          ],
          metadata: { buildingName: "Harbor View" },
        },
        {
          logger: {
            info(entry) {
              logs.push(entry);
            },
          },
        },
      );

      assert.equal(result.enqueued, true);
      assert.equal(result.updated, false);
      assert.equal(result.listingCount, 1);
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING);
      assert.equal(result.delayMs, BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS);

      const job = await getQueue().getJob(
        jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING, targetBuildingId),
      );

      assert.ok(job);
      assert.equal(await job.getState(), "delayed");
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING);
      assert.equal(job.data.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(job.data.buildingId, targetBuildingId);
      assert.equal(job.data.occurredAt, OCCURRED_AT.toISOString());
      assert.equal(job.data.metadata.buildingName, "Harbor View");
      assert.deepEqual(job.data.excludeUserIds.sort(), [targetExcludeId].sort());
      assert.equal(job.data.listings.length, 1);
      assert.equal(job.data.listings[0].listingId, targetListingId);
      assert.equal(job.data.listings[0].rent, 5200);
      assert.equal(job.data.listings[0].excludeUserId, targetExcludeId);

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.enqueued, true);

      await closeQueueProducer();
    });

    test("enqueues a delayed price-drop job with empty listings", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();

      const result = await enqueueBuildingFollowersNotify({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId: targetBuildingId,
        occurredAt: OCCURRED_AT,
        metadata: {
          buildingName: "Harbor View",
          oldMinRent: 7000,
          newMinRent: 5500,
        },
      });

      assert.equal(result.enqueued, true);
      assert.equal(result.listingCount, 0);
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP);

      const job = await getQueue().getJob(
        jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED, targetBuildingId),
      );

      assert.ok(job);
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP);
      assert.equal(job.data.metadata.oldMinRent, 7000);
      assert.equal(job.data.metadata.newMinRent, 5500);
      assert.deepEqual(job.data.listings, []);

      await closeQueueProducer();
    });

    test("enqueues a delayed available-again job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const targetListingId = new mongoose.Types.ObjectId().toString();

      const result = await enqueueBuildingFollowersNotify({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
        buildingId: targetBuildingId,
        occurredAt: OCCURRED_AT,
        listings: [
          {
            listingId: targetListingId,
            rent: 5400,
            occurredAt: OCCURRED_AT,
            availabilityChanged: true,
          },
        ],
        metadata: { buildingName: "Harbor View" },
      });

      assert.equal(result.enqueued, true);
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN);
      assert.equal(result.listingCount, 1);

      const job = await getQueue().getJob(
        jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN, targetBuildingId),
      );

      assert.ok(job);
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN);
      assert.equal(job.data.listings[0].availabilityChanged, true);

      await closeQueueProducer();
    });

    test("merges a second event into the existing delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const listingA = new mongoose.Types.ObjectId().toString();
      const listingB = new mongoose.Types.ObjectId().toString();

      const first = await enqueueBuildingFollowersNotify({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
        listings: [
          {
            listingId: listingA,
            rent: 5000,
            occurredAt: new Date("2026-08-01T10:00:00.000Z"),
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      });

      const second = await enqueueBuildingFollowersNotify({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: targetBuildingId,
        occurredAt: new Date("2026-08-01T10:05:00.000Z"),
        listings: [
          {
            listingId: listingB,
            rent: 5200,
            occurredAt: new Date("2026-08-01T10:05:00.000Z"),
          },
        ],
        metadata: { buildingName: "Merge Tower" },
      });

      assert.equal(first.enqueued, true);
      assert.equal(first.updated, false);
      assert.equal(second.enqueued, true);
      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 2);

      const job = await getQueue().getJob(
        jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING, targetBuildingId),
      );

      assert.ok(job);
      assert.equal(job.data.listings.length, 2);
      assert.equal(job.data.occurredAt, "2026-08-01T10:05:00.000Z");

      await closeQueueProducer();
    });

    test("accepts a custom delayMs option", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId().toString();
      const customDelayMs = 12_345;

      const result = await enqueueBuildingFollowersNotify(
        {
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId: targetBuildingId,
          occurredAt: OCCURRED_AT,
          listings: [
            {
              listingId: new mongoose.Types.ObjectId().toString(),
              rent: 5500,
              occurredAt: OCCURRED_AT,
            },
          ],
          metadata: { buildingName: "Delay Tower" },
        },
        { delayMs: customDelayMs },
      );

      assert.equal(result.enqueued, true);
      assert.equal(result.delayMs, customDelayMs);

      const job = await getQueue().getJob(
        jobIdFor(BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING, targetBuildingId),
      );

      assert.ok(job);
      assert.equal(job.opts.delay, customDelayMs);

      await closeQueueProducer();
    });
  },
);
