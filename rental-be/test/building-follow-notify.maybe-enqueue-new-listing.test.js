import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { maybeEnqueueBuildingFollowerNewListing } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
import { clearJobHandlersForTests } from "../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

const buildingId = new mongoose.Types.ObjectId();
const listedBy = new mongoose.Types.ObjectId();
const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const createPublicListing = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  buildingId,
  listedBy,
  visibility: LISTING_VISIBILITIES.PUBLIC,
  isDeleted: false,
  rent: 5500,
  availableAt: null,
  ...overrides,
});

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: true,
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    prefix: `rental:queue:new-listing-enqueue:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 3,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

const newListingJobId = (id = buildingId) =>
  `building.followers.notify-${id.toString()}-NEW_LISTING`;

describe("maybeEnqueueBuildingFollowerNewListing", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("returns no_change without touching the queue", () => {
    test("rejects calls with no eligible public listing", async () => {
      const cases = [
        {
          label: "no arguments",
          input: undefined,
        },
        {
          label: "missing listing",
          input: { buildingName: "Tower" },
        },
        {
          label: "null listing",
          input: { listing: null, buildingName: "Tower" },
        },
        {
          label: "private listing",
          input: {
            listing: createPublicListing({
              visibility: LISTING_VISIBILITIES.PRIVATE,
            }),
            buildingName: "Tower",
          },
        },
        {
          label: "deleted listing",
          input: {
            listing: createPublicListing({ isDeleted: true }),
            buildingName: "Tower",
          },
        },
        {
          label: "listing without id",
          input: {
            listing: {
              buildingId,
              visibility: LISTING_VISIBILITIES.PUBLIC,
              isDeleted: false,
              rent: 5000,
            },
            buildingName: "Tower",
          },
        },
      ];

      for (const { label, input } of cases) {
        const result = await maybeEnqueueBuildingFollowerNewListing(input);

        assert.deepEqual(
          result,
          { enqueued: false, reason: "no_change" },
          `expected no_change for ${label}`,
        );
      }
    });

    test("does not log when no new public listing is detected", async () => {
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerNewListing({
        listing: createPublicListing({
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
        buildingName: "Tower",
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
    test("returns disabled for a valid new public listing", async () => {
      const result = await maybeEnqueueBuildingFollowerNewListing({
        listing: createPublicListing(),
        buildingName: "Tower",
      });

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
    });

    test("logs the enqueue attempt when a logger is provided", async () => {
      const logs = [];
      const listing = createPublicListing();

      await maybeEnqueueBuildingFollowerNewListing({
        listing,
        buildingId,
        buildingName: "Tower",
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.event, "building_followers_notify_enqueued");
      assert.equal(logs[0]?.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(logs[0]?.buildingId, buildingId.toString());
      assert.equal(logs[0]?.listingCount, 1);
      assert.equal(logs[0]?.enqueued, false);
      assert.equal(logs[0]?.reason, "disabled");
    });
  });
});

describe(
  "maybeEnqueueBuildingFollowerNewListing integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("enqueues a delayed new-listing job with the expected payload", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const listing = createPublicListing({
        buildingId: targetBuildingId,
        listedBy: ownerId,
        rent: 5200,
      });
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerNewListing({
        listing,
        buildingName: "Harbor View",
        occurredAt: OCCURRED_AT,
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(result.enqueued, true);
      assert.equal(result.updated, false);
      assert.equal(result.listingCount, 1);
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING);
      assert.equal(result.delayMs, BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS);

      const job = await getQueue().getJob(newListingJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(await job.getState(), "delayed");
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING);
      assert.equal(job.data.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(job.data.buildingId, targetBuildingId.toString());
      assert.equal(job.data.occurredAt, OCCURRED_AT.toISOString());
      assert.equal(job.data.metadata.buildingName, "Harbor View");
      assert.equal(job.data.listings.length, 1);
      assert.equal(job.data.listings[0].listingId, listing._id.toString());
      assert.equal(job.data.listings[0].rent, 5200);
      assert.equal(job.data.listings[0].excludeUserId, ownerId.toString());
      assert.equal(job.data.listings[0].occurredAt, OCCURRED_AT.toISOString());

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.enqueued, true);

      await closeQueueProducer();
    });

    test("merges a second listing into the existing delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const listingA = createPublicListing({
        buildingId: targetBuildingId,
        rent: 5000,
      });
      const listingB = createPublicListing({
        buildingId: targetBuildingId,
        rent: 5200,
      });

      const first = await maybeEnqueueBuildingFollowerNewListing({
        listing: listingA,
        buildingName: "Merge Tower",
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      const second = await maybeEnqueueBuildingFollowerNewListing({
        listing: listingB,
        buildingName: "Merge Tower",
        occurredAt: new Date("2026-08-01T10:05:00.000Z"),
      });

      assert.equal(first.enqueued, true);
      assert.equal(first.updated, false);
      assert.equal(second.enqueued, true);
      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 2);

      const job = await getQueue().getJob(newListingJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(job.data.listings.length, 2);
      assert.equal(job.data.occurredAt, "2026-08-01T10:05:00.000Z");
      assert.deepEqual(
        job.data.listings.map((entry) => entry.listingId).sort(),
        [listingA._id.toString(), listingB._id.toString()].sort(),
      );

      await closeQueueProducer();
    });

    test("updates the same listing entry when it is enqueued twice", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const listing = createPublicListing({
        buildingId: targetBuildingId,
        rent: 5000,
      });

      await maybeEnqueueBuildingFollowerNewListing({
        listing,
        buildingName: "Dedupe Tower",
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      listing.rent = 4800;

      const second = await maybeEnqueueBuildingFollowerNewListing({
        listing,
        buildingName: "Dedupe Tower",
        occurredAt: new Date("2026-08-01T10:03:00.000Z"),
      });

      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 1);

      const job = await getQueue().getJob(newListingJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(job.data.listings.length, 1);
      assert.equal(job.data.listings[0].rent, 4800);
      assert.equal(job.data.listings[0].occurredAt, "2026-08-01T10:03:00.000Z");

      await closeQueueProducer();
    });

    test("uses buildingId from input when provided separately from the listing", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const listingBuildingId = new mongoose.Types.ObjectId();
      const overrideBuildingId = new mongoose.Types.ObjectId();
      const listing = createPublicListing({
        buildingId: listingBuildingId,
      });

      const result = await maybeEnqueueBuildingFollowerNewListing({
        listing,
        buildingId: overrideBuildingId,
        buildingName: "Override Tower",
      });

      assert.equal(result.enqueued, true);

      const job = await getQueue().getJob(newListingJobId(overrideBuildingId));

      assert.ok(job);
      assert.equal(job.data.buildingId, overrideBuildingId.toString());

      await closeQueueProducer();
    });
  },
);
