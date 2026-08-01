process.env.BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS ??= "100";

import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildBuildingFollowersNotifyJobId } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import {
  maybeEnqueueBuildingFollowerAvailableAgain,
  maybeEnqueueBuildingFollowerNewListing,
  maybeEnqueueBuildingFollowerPriceDrop,
} from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { ownerUpdateListingService } from "../modules/listing/services/owner-update-listing.service.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import Notification from "../modules/notification/notification.model.js";
import NotificationDedupe from "../modules/notification/notification-dedupe.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import User from "../modules/user/user.model.js";
import { validateEnvironment } from "../config/environment.js";
import { JOB_NAMES } from "../shared/queue/constants.js";
import { enqueueJob } from "../shared/queue/enqueue.js";
import { registerDefaultJobHandlers } from "../shared/queue/handlers/index.js";
import { clearJobHandlersForTests } from "../shared/queue/handlers/registry.js";
import {
  getQueue,
  initializeQueueProducer,
  resetQueueStateForTests,
} from "../shared/queue/queue-manager.js";
import { startQueueWorker } from "../shared/queue/run-worker.js";
import {
  resetWorkerRuntimeContextForTests,
  setWorkerRuntimeContext,
} from "../shared/queue/worker-context.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

const shouldRunE2E = process.env.QUEUE_INTEGRATION_TEST === "true";

const createListingRecord = (overrides = {}) => ({
  rent: 5000,
  deposit: 5000,
  moveInCost: 10000,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
  contractMonths: 12,
  occupancy: 2,
  isForeignerAccepted: true,
  isTM30Provided: true,
  isCookingAllowed: true,
  isPetAllowed: false,
  visibility: LISTING_VISIBILITIES.PUBLIC,
  isDeleted: false,
  availableAt: null,
  facilities: ["Air Conditioner"],
  media: [],
  ...overrides,
});

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
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS: "100",
  ...overrides,
});

const createIsolatedQueueConfig = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return validateEnvironment(
    validEnvironment({
      QUEUE_PREFIX: `rental:queue:follower-e2e:${suffix}`,
    }),
  ).queue;
};

const jobIdFor = (buildingId, changeType) =>
  buildBuildingFollowersNotifyJobId({
    changeType,
    buildingId: buildingId.toString(),
  });

const waitForJobState = async (jobId, expectedState, timeoutMs = 15_000) => {
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

  const job = await getQueue().getJob(jobId);
  return job ?? null;
};

const promoteAndWaitForCompletion = async (jobId) => {
  const job = await getQueue().getJob(jobId);

  assert.ok(job, `expected queued job ${jobId}`);

  const state = await job.getState();

  if (state === "delayed") {
    await job.promote();
  }

  const completedJob = await waitForJobState(jobId, "completed");

  assert.ok(completedJob, `expected job ${jobId} to complete, last state=${state}`);
  assert.equal(completedJob.returnvalue?.ok, true);

  return completedJob;
};

let replSet;
let workerRuntime;
let queueConfig;

const seedScenario = async ({
  buildingName = "E2E Tower",
  minRent = 5000,
  maxRent = 5000,
  followerCount = 1,
  followedAt = new Date(Date.now() - 60_000),
} = {}) => {
  const owner = await User.create({
    name: "E2E Owner",
    email: `e2e-owner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
  });

  const followers = await User.insertMany(
    Array.from({ length: followerCount }, (_, index) => ({
      name: `E2E Follower ${index + 1}`,
      email: `e2e-follower-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}@example.com`,
    })),
  );

  const building = await Building.create({
    name: buildingName,
    minRent,
    maxRent,
    isActive: true,
    createdBy: owner._id,
    location: { type: "Point", coordinates: [100.5018, 13.7563] },
  });

  await BuildingFollow.insertMany(
    followers.map((follower) => ({
      userId: follower._id,
      buildingId: building._id,
      createdAt: followedAt,
    })),
  );

  const listing = await Listing.create(
    createListingRecord({
      buildingId: building._id,
      listedBy: owner._id,
      rent: minRent,
    }),
  );

  return { owner, followers, building, listing };
};

describe(
  "building follower notify end to end",
  { skip: !shouldRunE2E },
  () => {
    before(async () => {
      replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1 },
        binary: process.env.MONGOMS_SYSTEM_BINARY
          ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
          : { version: process.env.MONGOMS_VERSION || "7.0.14" },
      });

      await mongoose.connect(replSet.getUri("building_follow_notify_e2e_test"));
    });

    beforeEach(async () => {
      await mongoose.connection.db.dropDatabase();
      resetWorkerRuntimeContextForTests();
      clearJobHandlersForTests();
      await resetQueueStateForTests();

      queueConfig = createIsolatedQueueConfig();
      registerDefaultJobHandlers();
      await initializeQueueProducer(queueConfig);
      workerRuntime = await startQueueWorker(queueConfig);

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });
    });

    afterEach(async () => {
      resetWorkerRuntimeContextForTests();
      clearJobHandlersForTests();
      await workerRuntime?.close();
      workerRuntime = null;
      await resetQueueStateForTests();
    });

    after(async () => {
      resetWorkerRuntimeContextForTests();
      await mongoose.disconnect();
      await replSet?.stop();
    });

    test("delivers a price drop from owner rent update through the worker", async () => {
      const { owner, followers, building, listing } = await seedScenario();

      await ownerUpdateListingService({
        listingId: listing._id,
        actorId: owner._id,
        body: { rent: 4000 },
      });

      const job = await promoteAndWaitForCompletion(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED),
      );

      assert.equal(job.returnvalue.skipped, false);
      assert.equal(job.returnvalue.sent, 1);

      const notifications = await Notification.find({
        recipient: followers[0]._id,
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_PRICE_DROPPED,
      }).lean();

      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
      assert.match(notifications[0].message, /4,000 THB\/month/);
    });

    test("merges debounced new listings before delivering one batch notification", async () => {
      const { followers, building, owner } = await seedScenario({
        followedAt: new Date("2026-07-01T10:00:00.000Z"),
      });

      const listingA = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 4800,
        }),
      );
      const listingB = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 4600,
        }),
      );

      const firstOccurredAt = new Date("2026-08-01T10:00:00.000Z");
      const secondOccurredAt = new Date("2026-08-01T10:01:00.000Z");

      const first = await maybeEnqueueBuildingFollowerNewListing({
        listing: listingA.toObject(),
        buildingId: building._id,
        buildingName: building.name,
        occurredAt: firstOccurredAt,
      });
      const second = await maybeEnqueueBuildingFollowerNewListing({
        listing: listingB.toObject(),
        buildingId: building._id,
        buildingName: building.name,
        occurredAt: secondOccurredAt,
      });

      assert.equal(first.enqueued, true);
      assert.equal(first.updated, false);
      assert.equal(second.enqueued, true);
      assert.equal(second.updated, true);
      assert.equal(second.listingCount, 2);

      const queuedJob = await getQueue().getJob(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING),
      );

      assert.ok(queuedJob);
      assert.equal(queuedJob.data.listings.length, 2);

      const job = await promoteAndWaitForCompletion(queuedJob.id);

      assert.equal(job.returnvalue.sent, 1);

      const [notification] = await Notification.find({
        recipient: followers[0]._id,
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING,
      }).lean();

      assert.match(notification.title, /2 new listings/);
      assert.equal(notification.metadata.listingCount, 2);
    });

    test("delivers an available-again notification through the worker", async () => {
      const { followers, building, listing } = await seedScenario();

      const futureAvailableAt = startOfCalendarDayInTimeZone("2026-09-01");
      await Listing.findByIdAndUpdate(listing._id, {
        $set: { availableAt: futureAvailableAt },
      });

      const before = await Listing.findById(listing._id).lean();
      await Listing.findByIdAndUpdate(listing._id, { $set: { availableAt: null } });
      const after = await Listing.findById(listing._id).lean();

      const enqueueResult = await maybeEnqueueBuildingFollowerAvailableAgain({
        before,
        after,
        buildingName: building.name,
        occurredAt: new Date(),
        referenceDate: startOfCalendarDayInTimeZone("2026-08-15"),
      });

      assert.equal(enqueueResult.enqueued, true);

      const job = await promoteAndWaitForCompletion(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN),
      );

      assert.equal(job.returnvalue.sent, 1);

      const [notification] = await Notification.find({
        recipient: followers[0]._id,
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_AVAILABLE_AGAIN,
      }).lean();

      assert.match(notification.message, /available again/i);
    });

    test("skips stale price-drop jobs when live building rent no longer matches", async () => {
      const { building, listing, owner, followers } = await seedScenario({
        minRent: 7000,
        maxRent: 7000,
      });

      await Listing.findByIdAndUpdate(listing._id, { $set: { rent: 7000 } });
      await Building.findByIdAndUpdate(building._id, {
        $set: { minRent: 7000, maxRent: 7000 },
      });

      await ownerUpdateListingService({
        listingId: listing._id,
        actorId: owner._id,
        body: { rent: 5500 },
      });

      await Building.findByIdAndUpdate(building._id, {
        $set: { minRent: 7000, maxRent: 7000 },
      });
      await Listing.findByIdAndUpdate(listing._id, { $set: { rent: 7000 } });

      const job = await promoteAndWaitForCompletion(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED),
      );

      assert.equal(job.returnvalue.skipped, true);
      assert.equal(job.returnvalue.reason, "stale_event");
      assert.equal(
        await Notification.countDocuments({ recipient: followers[0]._id }),
        0,
      );
    });

    test("does not notify followers who joined after the event occurred", async () => {
      const { building } = await seedScenario({
        followerCount: 0,
      });

      const earlyFollower = await User.create({
        name: "Early Follower",
        email: `e2e-early-${Date.now()}@example.com`,
      });
      const lateFollower = await User.create({
        name: "Late Follower",
        email: `e2e-late-${Date.now()}@example.com`,
      });

      await BuildingFollow.insertMany([
        {
          userId: earlyFollower._id,
          buildingId: building._id,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        },
        {
          userId: lateFollower._id,
          buildingId: building._id,
          createdAt: new Date(),
        },
      ]);

      const occurredAt = new Date(Date.now() - 60_000);

      await maybeEnqueueBuildingFollowerPriceDrop({
        buildingId: building._id,
        buildingName: building.name,
        oldMinRent: 7000,
        newMinRent: 5500,
        occurredAt,
      });

      await Building.findByIdAndUpdate(building._id, {
        $set: { minRent: 5500, maxRent: 7000 },
      });

      const job = await promoteAndWaitForCompletion(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED),
      );

      assert.equal(job.returnvalue.requested, 1);
      assert.equal(job.returnvalue.sent, 1);
      assert.equal(
        await Notification.countDocuments({ recipient: earlyFollower._id }),
        1,
      );
      assert.equal(
        await Notification.countDocuments({ recipient: lateFollower._id }),
        0,
      );
    });

    test("dedupes repeated delivery for the same follower batch", async () => {
      const { followers, building, owner } = await seedScenario({
        followedAt: new Date("2026-07-01T10:00:00.000Z"),
      });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 4700,
        }),
      );

      const occurredAt = "2026-08-01T12:00:00.000Z";
      const jobData = {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: building._id.toString(),
        occurredAt,
        listings: [
          {
            listingId: listing._id.toString(),
            rent: listing.rent,
            occurredAt,
            excludeUserId: owner._id.toString(),
          },
        ],
        metadata: { buildingName: building.name },
      };

      const jobId = jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        data: jobData,
        jobId,
        delayMs: 100,
      });

      const firstJob = await promoteAndWaitForCompletion(jobId);

      assert.equal(firstJob.returnvalue.sent, 1);

      const repeatJobId = `${jobId}-repeat-${Date.now()}`;

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
        data: jobData,
        jobId: repeatJobId,
        delayMs: 0,
      });

      const repeatJob = await promoteAndWaitForCompletion(repeatJobId);

      assert.equal(repeatJob.returnvalue.sent, 0);
      assert.equal(repeatJob.returnvalue.skippedDuplicate, 1);
      assert.equal(await Notification.countDocuments(), 1);
      assert.equal(await NotificationDedupe.countDocuments(), 1);
    });

    test("routes legacy building.followers.notify jobs to the dedicated handlers", async () => {
      const { followers, building, owner } = await seedScenario();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 4300,
        }),
      );

      const jobId = `legacy-notify-${Date.now()}`;

      await enqueueJob({
        name: JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
        data: {
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId: building._id.toString(),
          occurredAt: new Date().toISOString(),
          listings: [
            {
              listingId: listing._id.toString(),
              rent: listing.rent,
              occurredAt: new Date().toISOString(),
              excludeUserId: owner._id.toString(),
            },
          ],
          metadata: { buildingName: building.name },
        },
        jobId,
        delayMs: 0,
      });

      const job = await promoteAndWaitForCompletion(jobId);

      assert.equal(job.returnvalue.sent, 1);

      const [notification] = await Notification.find({
        recipient: followers[0]._id,
      }).lean();

      assert.equal(notification.type, NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING);
    });

    test("does not notify listing owners about their own listings", async () => {
      const owner = await User.create({
        name: "Owner Follower",
        email: `e2e-owner-follower-${Date.now()}@example.com`,
      });
      const follower = await User.create({
        name: "Other Follower",
        email: `e2e-other-follower-${Date.now()}@example.com`,
      });

      const building = await Building.create({
        name: "Owner Exclusion Tower",
        minRent: 5000,
        maxRent: 5000,
        isActive: true,
        createdBy: owner._id,
        location: { type: "Point", coordinates: [100.5018, 13.7563] },
      });

      await BuildingFollow.insertMany([
        {
          userId: owner._id,
          buildingId: building._id,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        },
        {
          userId: follower._id,
          buildingId: building._id,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        },
      ]);

      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5000,
        }),
      );

      await maybeEnqueueBuildingFollowerNewListing({
        listing: listing.toObject(),
        buildingId: building._id,
        buildingName: building.name,
        occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      const job = await promoteAndWaitForCompletion(
        jobIdFor(building._id, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING),
      );

      assert.equal(job.returnvalue.requested, 1);
      assert.equal(job.returnvalue.sent, 1);
      assert.equal(await Notification.countDocuments({ recipient: owner._id }), 0);
      assert.equal(await Notification.countDocuments({ recipient: follower._id }), 1);
    });
  },
);
