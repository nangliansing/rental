import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { maybeEnqueueBuildingFollowerAvailableAgain } from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
import { clearJobHandlersForTests } from "../shared/queue/handlers/registry.js";
import {
  closeQueueProducer,
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

const shouldRunIntegration = process.env.QUEUE_INTEGRATION_TEST === "true";

const buildingId = new mongoose.Types.ObjectId();
const listedBy = new mongoose.Types.ObjectId();
const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");
const REFERENCE_DATE = startOfCalendarDayInTimeZone("2026-08-15");
const FUTURE_AVAILABLE_AT = startOfCalendarDayInTimeZone("2026-09-01");
const AVAILABLE_NOW = startOfCalendarDayInTimeZone("2026-08-15");

const createAfterListing = (overrides = {}) => ({
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
    prefix: `rental:queue:available-again-enqueue:${suffix}`,
    workerConcurrency: 1,
    defaultAttempts: 3,
    backoffDelayMs: 1000,
    removeOnCompleteAgeSeconds: 60,
    removeOnCompleteCount: 100,
    removeOnFailAgeSeconds: 60,
    removeOnFailCount: 100,
  };
};

const availableAgainJobId = (id = buildingId) =>
  `building.followers.notify-${id.toString()}-AVAILABLE_AGAIN`;

describe("maybeEnqueueBuildingFollowerAvailableAgain", () => {
  afterEach(async () => {
    await resetQueueStateForTests();
  });

  describe("returns no_change without touching the queue", () => {
    test("rejects calls with no eligible available-again transition", async () => {
      const cases = [
        {
          label: "no arguments",
          input: undefined,
        },
        {
          label: "missing before",
          input: {
            after: createAfterListing(),
            buildingName: "Tower",
          },
        },
        {
          label: "missing after",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PRIVATE,
              availableAt: null,
            },
            buildingName: "Tower",
          },
        },
        {
          label: "after still private",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PRIVATE,
              availableAt: null,
            },
            after: createAfterListing({
              visibility: LISTING_VISIBILITIES.PRIVATE,
            }),
            buildingName: "Tower",
          },
        },
        {
          label: "after deleted",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PRIVATE,
              availableAt: null,
            },
            after: createAfterListing({ isDeleted: true }),
            buildingName: "Tower",
          },
        },
        {
          label: "no visibility or availability change",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PUBLIC,
              availableAt: null,
            },
            after: createAfterListing({ availableAt: null }),
            buildingName: "Tower",
          },
        },
        {
          label: "still unavailable on a future date",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PUBLIC,
              availableAt: FUTURE_AVAILABLE_AT,
            },
            after: createAfterListing({
              availableAt: FUTURE_AVAILABLE_AT,
            }),
            referenceDate: REFERENCE_DATE,
            buildingName: "Tower",
          },
        },
        {
          label: "after without listing id",
          input: {
            before: {
              visibility: LISTING_VISIBILITIES.PRIVATE,
              availableAt: null,
            },
            after: {
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
        const result = await maybeEnqueueBuildingFollowerAvailableAgain(input);

        assert.deepEqual(
          result,
          { enqueued: false, reason: "no_change" },
          `expected no_change for ${label}`,
        );
      }
    });

    test("does not log when no available-again transition is detected", async () => {
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PUBLIC,
          availableAt: null,
        },
        after: createAfterListing(),
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
    test("returns disabled for a private-to-public transition", async () => {
      const result = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: createAfterListing(),
        buildingName: "Tower",
      });

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
    });

    test("returns disabled for an availability transition", async () => {
      const result = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PUBLIC,
          availableAt: FUTURE_AVAILABLE_AT,
        },
        after: createAfterListing({
          availableAt: AVAILABLE_NOW,
        }),
        referenceDate: REFERENCE_DATE,
        buildingName: "Tower",
      });

      assert.equal(result.enqueued, false);
      assert.equal(result.reason, "disabled");
    });

    test("logs the enqueue attempt when a logger is provided", async () => {
      const logs = [];
      const after = createAfterListing();

      await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after,
        buildingName: "Tower",
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.event, "building_followers_notify_enqueued");
      assert.equal(
        logs[0]?.changeType,
        BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
      );
      assert.equal(logs[0]?.buildingId, buildingId.toString());
      assert.equal(logs[0]?.listingCount, 1);
      assert.equal(logs[0]?.enqueued, false);
      assert.equal(logs[0]?.reason, "disabled");
    });
  });
});

describe(
  "maybeEnqueueBuildingFollowerAvailableAgain integration",
  { skip: !shouldRunIntegration },
  () => {
    afterEach(async () => {
      clearJobHandlersForTests();
      await resetQueueStateForTests();
    });

    test("enqueues a delayed available-again job for a private-to-public transition", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const after = createAfterListing({
        buildingId: targetBuildingId,
        listedBy: ownerId,
        rent: 5200,
      });
      const logs = [];

      const result = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after,
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
      assert.equal(result.name, JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN);
      assert.equal(result.delayMs, BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS);

      const job = await getQueue().getJob(availableAgainJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(await job.getState(), "delayed");
      assert.equal(job.name, JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN);
      assert.equal(
        job.data.changeType,
        BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
      );
      assert.equal(job.data.buildingId, targetBuildingId.toString());
      assert.equal(job.data.occurredAt, OCCURRED_AT.toISOString());
      assert.equal(job.data.metadata.buildingName, "Harbor View");
      assert.equal(job.data.listings.length, 1);

      const [listingEntry] = job.data.listings;
      assert.equal(listingEntry.listingId, after._id.toString());
      assert.equal(listingEntry.rent, 5200);
      assert.equal(listingEntry.excludeUserId, ownerId.toString());
      assert.equal(listingEntry.becamePublic, true);
      assert.equal(listingEntry.availabilityChanged, false);
      assert.equal(listingEntry.occurredAt, OCCURRED_AT.toISOString());

      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.enqueued, true);

      await closeQueueProducer();
    });

    test("enqueues a delayed job when availability moves to now", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const after = createAfterListing({
        buildingId: targetBuildingId,
        availableAt: AVAILABLE_NOW,
        rent: 5000,
      });

      const result = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PUBLIC,
          availableAt: FUTURE_AVAILABLE_AT,
        },
        after,
        referenceDate: REFERENCE_DATE,
        buildingName: "Availability Tower",
        occurredAt: OCCURRED_AT,
      });

      assert.equal(result.enqueued, true);

      const job = await getQueue().getJob(availableAgainJobId(targetBuildingId));
      const [listingEntry] = job.data.listings;

      assert.equal(listingEntry.becamePublic, false);
      assert.equal(listingEntry.availabilityChanged, true);
      assert.equal(
        new Date(listingEntry.availableAt).toISOString(),
        AVAILABLE_NOW.toISOString(),
      );

      await closeQueueProducer();
    });

    test("merges a second listing into the existing delayed job", async () => {
      await initializeQueueProducer(createIsolatedQueueConfig());

      const targetBuildingId = new mongoose.Types.ObjectId();
      const listingA = createAfterListing({
        buildingId: targetBuildingId,
        rent: 5000,
      });
      const listingB = createAfterListing({
        buildingId: targetBuildingId,
        rent: 5200,
      });

      const first = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: listingA,
        buildingName: "Merge Tower",
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      const second = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: listingB,
        buildingName: "Merge Tower",
        occurredAt: new Date("2026-08-01T10:05:00.000Z"),
      });

      assert.equal(first.enqueued, true);
      assert.equal(first.updated, false);
      assert.equal(second.enqueued, true);
      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 2);

      const job = await getQueue().getJob(availableAgainJobId(targetBuildingId));

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
      const after = createAfterListing({
        buildingId: targetBuildingId,
        rent: 5000,
      });

      await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after,
        buildingName: "Dedupe Tower",
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      after.rent = 4800;

      const second = await maybeEnqueueBuildingFollowerAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after,
        buildingName: "Dedupe Tower",
        occurredAt: new Date("2026-08-01T10:03:00.000Z"),
      });

      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 1);

      const job = await getQueue().getJob(availableAgainJobId(targetBuildingId));

      assert.ok(job);
      assert.equal(job.data.listings.length, 1);
      assert.equal(job.data.listings[0].rent, 4800);
      assert.equal(job.data.listings[0].occurredAt, "2026-08-01T10:03:00.000Z");

      await closeQueueProducer();
    });
  },
);
