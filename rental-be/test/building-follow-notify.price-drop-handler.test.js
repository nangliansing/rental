import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import { handleBuildingFollowerPriceDropJob } from "../modules/building-follow-notify/handlers/price-drop.handler.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import Notification from "../modules/notification/notification.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import Listing from "../modules/listing/listing.model.js";
import { AppError } from "../shared/errors/app-error.js";
import User from "../modules/user/user.model.js";
import {
  resetWorkerRuntimeContextForTests,
  setWorkerRuntimeContext,
} from "../shared/queue/worker-context.js";

let mongoServer;

const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const createPriceDropJob = ({
  id = "price-drop-job",
  buildingId,
  oldMinRent,
  newMinRent,
  occurredAt = OCCURRED_AT,
  buildingName = "Price Drop Tower",
  excludeUserIds = [],
} = {}) => ({
  id,
  data: {
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
    buildingId: buildingId.toString(),
    occurredAt: occurredAt.toISOString(),
    excludeUserIds,
    metadata: {
      buildingName,
      oldMinRent,
      newMinRent,
    },
  },
});

const createBuilding = async ({
  ownerId,
  minRent,
  isActive = true,
  name = "Price Drop Tower",
} = {}) =>
  Building.create({
    name,
    isActive,
    minRent,
    maxRent: Math.max(minRent ?? 0, 7000),
    createdBy: ownerId,
    location: {
      type: "Point",
      coordinates: [100.5018, 13.7563],
    },
  });

const followBuilding = async ({
  userId,
  buildingId,
  followedAt = new Date("2026-07-01T10:00:00.000Z"),
}) =>
  BuildingFollow.create({
    userId,
    buildingId,
    createdAt: followedAt,
  });

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(
    mongoServer.getUri("building_follow_price_drop_handler_test"),
  );
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  resetWorkerRuntimeContextForTests();
});

after(async () => {
  resetWorkerRuntimeContextForTests();
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("handleBuildingFollowerPriceDropJob", () => {
  describe("rejects invalid job payloads", () => {
    test("throws when the job data is for a different change type", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-wrong-type@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await assert.rejects(
        () =>
          handleBuildingFollowerPriceDropJob({
            id: "wrong-type-job",
            data: {
              changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
              buildingId: building._id.toString(),
              occurredAt: OCCURRED_AT.toISOString(),
              listings: [
                {
                  listingId: new mongoose.Types.ObjectId().toString(),
                  rent: 5500,
                  occurredAt: OCCURRED_AT.toISOString(),
                },
              ],
              metadata: {
                buildingName: building.name,
              },
            },
          }),
        /Expected PRICE_DROPPED job, received NEW_LISTING/,
      );
    });

    test("throws a validation error when required price metadata is missing", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-invalid@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await assert.rejects(
        () =>
          handleBuildingFollowerPriceDropJob({
            id: "invalid-job",
            data: {
              changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
              buildingId: building._id.toString(),
              occurredAt: OCCURRED_AT.toISOString(),
              metadata: {
                buildingName: building.name,
                oldMinRent: 7000,
              },
            },
          }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });
  });

  describe("skips stale or undeliverable events", () => {
    test("returns stale_event when live min rent no longer reflects the drop", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-stale@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 7000,
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      assert.deepEqual(result, {
        ok: true,
        skipped: true,
        reason: "stale_event",
      });
      assert.equal(await Notification.countDocuments(), 0);
    });

    test("returns stale_event for inactive buildings", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-inactive@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-inactive@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
        isActive: false,
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      assert.equal(result.skipped, true);
      assert.equal(result.reason, "stale_event");
      assert.equal(await Notification.countDocuments(), 0);
    });

    test("logs a stale skip when a logger is available", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-log-stale@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 7000,
      });
      const logs = [];

      setWorkerRuntimeContext({
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          id: "stale-log-job",
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      assert.equal(
        logs.some((entry) => entry.event === "building_followers_notify_skipped_stale"),
        true,
      );
      assert.equal(logs.at(-1)?.jobId, "stale-log-job");
    });
  });

  describe("delivers price drop notifications to eligible followers", () => {
    test("delivers one notification to a follower who followed before the event", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-deliver@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-deliver@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      const published = [];
      setWorkerRuntimeContext({
        publishRealtimeHint: async (hint) => {
          published.push(hint);
        },
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          id: "deliver-job",
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
          buildingName: building.name,
        }),
      );

      assert.equal(result.ok, true);
      assert.equal(result.skipped, false);
      assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED);
      assert.equal(result.listingCount, 0);
      assert.equal(result.requested, 1);
      assert.equal(result.sent, 1);
      assert.equal(result.skippedDuplicate, 0);
      assert.equal(published.length, 1);

      const [notification] = await Notification.find().lean();
      assert.equal(notification.recipient.toString(), follower._id.toString());
      assert.equal(
        notification.type,
        NOTIFICATION_TYPES.FOLLOWED_BUILDING_PRICE_DROPPED,
      );
      assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
      assert.equal(notification.entityId.toString(), building._id.toString());
      assert.match(notification.message, /7,000 THB\/month/);
      assert.match(notification.message, /5,500 THB\/month/);
    });

    test("skips followers who started following after the price drop occurred", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-late@example.com",
      });
      const earlyFollower = await User.create({
        name: "Early Follower",
        email: "early-follower@example.com",
      });
      const lateFollower = await User.create({
        name: "Late Follower",
        email: "late-follower@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await followBuilding({
        userId: earlyFollower._id,
        buildingId: building._id,
        followedAt: new Date("2026-07-01T10:00:00.000Z"),
      });
      await followBuilding({
        userId: lateFollower._id,
        buildingId: building._id,
        followedAt: new Date("2026-08-02T10:00:00.000Z"),
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      assert.equal(result.sent, 1);
      assert.equal(result.requested, 1);

      const notifications = await Notification.find().lean();
      assert.equal(notifications.length, 1);
      assert.equal(
        notifications[0]?.recipient.toString(),
        earlyFollower._id.toString(),
      );
    });

    test("skips users listed in excludeUserIds", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-excluded@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-excluded@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await followBuilding({
        userId: owner._id,
        buildingId: building._id,
      });
      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
          excludeUserIds: [owner._id.toString()],
        }),
      );

      assert.equal(result.sent, 1);
      assert.equal(result.requested, 1);

      const [notification] = await Notification.find().lean();
      assert.equal(notification.recipient.toString(), follower._id.toString());
    });

    test("uses the live building minRent in the delivered notification content", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-refresh@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-refresh@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5200,
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      const [notification] = await Notification.find().lean();
      assert.match(notification.message, /5,200 THB\/month/);
      assert.equal(notification.metadata.newMinRent, 5200);
    });

    test("resolves the building name from the database when job metadata omits it", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-name@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-name@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
        name: "Harbor View",
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      await handleBuildingFollowerPriceDropJob({
        id: "name-resolve-job",
        data: {
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
          buildingId: building._id.toString(),
          occurredAt: OCCURRED_AT.toISOString(),
          metadata: {
            oldMinRent: 7000,
            newMinRent: 5500,
          },
        },
      });

      const [notification] = await Notification.find().lean();
      assert.match(notification.title, /Harbor View/);
      assert.match(notification.message, /Harbor View/);
      assert.equal(notification.metadata.buildingName, "Harbor View");
    });
  });

  describe("dedupes and handles repeat runs safely", () => {
    test("skips duplicate delivery for the same follower and newMinRent", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-dedupe@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-dedupe@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const job = createPriceDropJob({
        id: "dedupe-job-1",
        buildingId: building._id,
        oldMinRent: 7000,
        newMinRent: 5500,
      });

      const first = await handleBuildingFollowerPriceDropJob(job);
      const second = await handleBuildingFollowerPriceDropJob({
        ...job,
        id: "dedupe-job-2",
      });

      assert.equal(first.sent, 1);
      assert.equal(second.sent, 0);
      assert.equal(second.skippedDuplicate, 1);
      assert.equal(await Notification.countDocuments(), 1);
    });

    test("delivers again when the live min rent changes to a new dedupe target", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-second-drop@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-second-drop@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const first = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          id: "first-drop",
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      await Building.updateOne({ _id: building._id }, { minRent: 5000 });

      const second = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          id: "second-drop",
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5000,
        }),
      );

      assert.equal(first.sent, 1);
      assert.equal(second.sent, 1);
      assert.equal(await Notification.countDocuments(), 2);

      const notifications = await Notification.find().sort({ createdAt: 1 }).lean();
      assert.equal(notifications[0]?.metadata.newMinRent, 5500);
      assert.equal(notifications[1]?.metadata.newMinRent, 5000);
    });
  });

  describe("handles empty follower sets safely", () => {
    test("returns a successful result without creating notifications when nobody follows the building", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-no-followers@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        minRent: 5500,
      });

      await Listing.create({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 5500,
        deposit: 5500,
        moveInCost: 11000,
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
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const result = await handleBuildingFollowerPriceDropJob(
        createPriceDropJob({
          buildingId: building._id,
          oldMinRent: 7000,
          newMinRent: 5500,
        }),
      );

      assert.equal(result.ok, true);
      assert.equal(result.skipped, false);
      assert.equal(result.requested, 0);
      assert.equal(result.sent, 0);
      assert.equal(await Notification.countDocuments(), 0);
    });
  });
});
