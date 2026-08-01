import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import { handleBuildingFollowerNewListingJob } from "../modules/building-follow-notify/handlers/new-listing.handler.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import Notification from "../modules/notification/notification.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import { AppError } from "../shared/errors/app-error.js";
import User from "../modules/user/user.model.js";
import {
  resetWorkerRuntimeContextForTests,
  setWorkerRuntimeContext,
} from "../shared/queue/worker-context.js";

let mongoServer;

const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const createListingRecord = (overrides = {}) => ({
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
  ...overrides,
});

const createListingEntry = ({
  listingId,
  rent = 5500,
  occurredAt = OCCURRED_AT,
  excludeUserId = null,
} = {}) => ({
  listingId: listingId.toString(),
  rent,
  availableAt: null,
  occurredAt: occurredAt.toISOString(),
  excludeUserId: excludeUserId?.toString() ?? null,
});

const createNewListingJob = ({
  id = "new-listing-job",
  buildingId,
  listings,
  occurredAt = OCCURRED_AT,
  buildingName = "New Listing Tower",
  excludeUserIds = [],
} = {}) => ({
  id,
  data: {
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    buildingId: buildingId.toString(),
    occurredAt: occurredAt.toISOString(),
    excludeUserIds,
    listings,
    metadata: {
      buildingName,
    },
  },
});

const createBuilding = async ({
  ownerId,
  isActive = true,
  name = "New Listing Tower",
  minRent = 5000,
} = {}) =>
  Building.create({
    name,
    isActive,
    minRent,
    maxRent: 7000,
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
    mongoServer.getUri("building_follow_new_listing_handler_test"),
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

describe("handleBuildingFollowerNewListingJob", () => {
  describe("rejects invalid job payloads", () => {
    test("throws when the job data is for a different change type", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-wrong-type@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });

      await assert.rejects(
        () =>
          handleBuildingFollowerNewListingJob({
            id: "wrong-type-job",
            data: {
              changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
              buildingId: building._id.toString(),
              occurredAt: OCCURRED_AT.toISOString(),
              metadata: {
                buildingName: building.name,
                oldMinRent: 7000,
                newMinRent: 5500,
              },
            },
          }),
        /Expected NEW_LISTING job, received PRICE_DROPPED/,
      );
    });

    test("throws a validation error when listings are missing", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-invalid@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });

      await assert.rejects(
        () =>
          handleBuildingFollowerNewListingJob({
            id: "invalid-job",
            data: {
              changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
              buildingId: building._id.toString(),
              occurredAt: OCCURRED_AT.toISOString(),
              metadata: {
                buildingName: building.name,
              },
            },
          }),
        (error) => error instanceof AppError && error.statusCode === 422,
      );
    });
  });

  describe("skips stale or undeliverable events", () => {
    test("returns stale_event when the listing is no longer public", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-private@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-private@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [createListingEntry({ listingId: listing._id })],
        }),
      );

      assert.deepEqual(result, {
        ok: true,
        skipped: true,
        reason: "stale_event",
      });
      assert.equal(await Notification.countDocuments(), 0);
    });

    test("returns stale_event when the listing was deleted before delivery", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-deleted@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          isDeleted: true,
        }),
      );

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [createListingEntry({ listingId: listing._id })],
        }),
      );

      assert.equal(result.skipped, true);
      assert.equal(result.reason, "stale_event");
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
        isActive: false,
      });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [createListingEntry({ listingId: listing._id })],
        }),
      );

      assert.equal(result.skipped, true);
      assert.equal(result.reason, "stale_event");
      assert.equal(await Notification.countDocuments(), 0);
    });

    test("returns stale_event when the listing belongs to a different building", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-wrong-building@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const otherBuilding = await createBuilding({
        ownerId: owner._id,
        name: "Other Tower",
      });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: otherBuilding._id,
          listedBy: owner._id,
        }),
      );

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [createListingEntry({ listingId: listing._id })],
        }),
      );

      assert.equal(result.skipped, true);
      assert.equal(result.reason, "stale_event");
    });

    test("logs a stale skip when a logger is available", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-log-stale@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
      );
      const logs = [];

      setWorkerRuntimeContext({
        logger: {
          info(entry) {
            logs.push(entry);
          },
        },
      });

      await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          id: "stale-log-job",
          buildingId: building._id,
          listings: [createListingEntry({ listingId: listing._id })],
        }),
      );

      assert.equal(
        logs.some((entry) => entry.event === "building_followers_notify_skipped_stale"),
        true,
      );
      assert.equal(logs.at(-1)?.jobId, "stale-log-job");
      assert.equal(logs.at(-1)?.listingCount, 1);
    });
  });

  describe("delivers new listing notifications to eligible followers", () => {
    test("delivers one notification to a follower who followed before the event", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-deliver@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-deliver@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

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

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          id: "deliver-job",
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: listing._id,
              excludeUserId: owner._id,
            }),
          ],
          buildingName: building.name,
        }),
      );

      assert.equal(result.ok, true);
      assert.equal(result.skipped, false);
      assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(result.listingCount, 1);
      assert.equal(result.requested, 1);
      assert.equal(result.sent, 1);
      assert.equal(result.skippedDuplicate, 0);
      assert.equal(published.length, 1);

      const [notification] = await Notification.find().lean();
      assert.equal(notification.recipient.toString(), follower._id.toString());
      assert.equal(
        notification.type,
        NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING,
      );
      assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.LISTING);
      assert.equal(notification.entityId.toString(), listing._id.toString());
      assert.match(notification.message, /5,500 THB\/month/);
    });

    test("skips followers who started following after the event occurred", async () => {
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
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

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

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: listing._id,
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      assert.equal(result.sent, 1);
      assert.equal(result.requested, 1);

      const [notification] = await Notification.find().lean();
      assert.equal(
        notification.recipient.toString(),
        earlyFollower._id.toString(),
      );
    });

    test("skips the listing owner via listing excludeUserId even when they follow the building", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-excluded@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-excluded@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

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

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: listing._id,
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      assert.equal(result.sent, 1);

      const [notification] = await Notification.find().lean();
      assert.equal(notification.recipient.toString(), follower._id.toString());
    });

    test("merges multiple listings into one plural notification per follower", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-merge@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-merge@example.com",
      });
      const building = await createBuilding({
        ownerId: owner._id,
        name: "Merge Tower",
      });
      const listings = await Listing.create(
        [5000, 5200, 5400].map((rent) =>
          createListingRecord({
            buildingId: building._id,
            listedBy: owner._id,
            rent,
          }),
        ),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          id: "merge-job",
          buildingId: building._id,
          buildingName: building.name,
          occurredAt: new Date("2026-08-01T12:00:00.000Z"),
          listings: listings.map((listing, index) =>
            createListingEntry({
              listingId: listing._id,
              rent: listing.rent,
              occurredAt: new Date(`2026-08-01T10:0${index}:00.000Z`),
              excludeUserId: owner._id,
            }),
          ),
        }),
      );

      assert.equal(result.sent, 1);
      assert.equal(result.listingCount, 3);

      const [notification] = await Notification.find().lean();
      assert.match(notification.title, /3 new listings at Merge Tower/);
      assert.match(notification.message, /3 new listings are now available/);
      assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
      assert.equal(notification.metadata.listingCount, 3);
    });

    test("only includes listings whose occurredAt is after the follower started following", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-partial-batch@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-partial-batch@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const earlyListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5000,
        }),
      );
      const lateListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5200,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
        followedAt: new Date("2026-07-15T10:00:00.000Z"),
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: earlyListing._id,
              rent: 5000,
              occurredAt: new Date("2026-07-01T10:00:00.000Z"),
              excludeUserId: owner._id,
            }),
            createListingEntry({
              listingId: lateListing._id,
              rent: 5200,
              occurredAt: new Date("2026-08-01T10:00:00.000Z"),
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      const [notification] = await Notification.find().lean();
      assert.match(notification.title, /New listing at/);
      assert.match(notification.message, /5,200 THB\/month/);
      assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.LISTING);
      assert.equal(notification.entityId.toString(), lateListing._id.toString());
    });

    test("uses the live listing rent in the delivered notification content", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-refresh@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-refresh@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5800,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: listing._id,
              rent: 5500,
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      const [notification] = await Notification.find().lean();
      assert.match(notification.message, /5,800 THB\/month/);
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
        name: "Harbor View",
      });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      await handleBuildingFollowerNewListingJob({
        id: "name-resolve-job",
        data: {
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId: building._id.toString(),
          occurredAt: OCCURRED_AT.toISOString(),
          listings: [
            createListingEntry({
              listingId: listing._id,
              excludeUserId: owner._id,
            }),
          ],
          metadata: {},
        },
      });

      const [notification] = await Notification.find().lean();
      assert.match(notification.title, /Harbor View/);
      assert.match(notification.message, /Harbor View/);
      assert.equal(notification.metadata.buildingName, "Harbor View");
    });
  });

  describe("dedupes and handles repeat runs safely", () => {
    test("skips duplicate delivery for the same follower and listing batch", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-dedupe@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-dedupe@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const job = createNewListingJob({
        id: "dedupe-job-1",
        buildingId: building._id,
        listings: [
          createListingEntry({
            listingId: listing._id,
            excludeUserId: owner._id,
          }),
        ],
      });

      const first = await handleBuildingFollowerNewListingJob(job);
      const second = await handleBuildingFollowerNewListingJob({
        ...job,
        id: "dedupe-job-2",
      });

      assert.equal(first.sent, 1);
      assert.equal(second.sent, 0);
      assert.equal(second.skippedDuplicate, 1);
      assert.equal(await Notification.countDocuments(), 1);
    });

    test("delivers again when the listing batch changes", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-second-listing@example.com",
      });
      const follower = await User.create({
        name: "Follower",
        email: "follower-second-listing@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const firstListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5000,
        }),
      );
      const secondListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          rent: 5200,
        }),
      );

      await followBuilding({
        userId: follower._id,
        buildingId: building._id,
      });

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const first = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          id: "first-listing-job",
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: firstListing._id,
              rent: 5000,
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      const second = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          id: "second-listing-job",
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: secondListing._id,
              rent: 5200,
              excludeUserId: owner._id,
            }),
          ],
        }),
      );

      assert.equal(first.sent, 1);
      assert.equal(second.sent, 1);
      assert.equal(await Notification.countDocuments(), 2);
    });
  });

  describe("handles empty follower sets safely", () => {
    test("returns a successful result without creating notifications when nobody follows the building", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner-no-followers@example.com",
      });
      const building = await createBuilding({ ownerId: owner._id });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      setWorkerRuntimeContext({
        publishRealtimeHint: async () => {},
      });

      const result = await handleBuildingFollowerNewListingJob(
        createNewListingJob({
          buildingId: building._id,
          listings: [
            createListingEntry({
              listingId: listing._id,
              excludeUserId: owner._id,
            }),
          ],
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
