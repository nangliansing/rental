import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import { handleBuildingFollowersNotifyJob } from "../modules/building-follow-notify/handlers/building-followers-notify.handler.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import Notification from "../modules/notification/notification.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import User from "../modules/user/user.model.js";
import {
  resetWorkerRuntimeContextForTests,
  setWorkerRuntimeContext,
} from "../shared/queue/worker-context.js";

let mongoServer;

const createListing = (overrides = {}) => ({
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

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("building_follow_notify_handler_test"));
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

describe("handleBuildingFollowersNotifyJob", () => {
  test("delivers notifications to followers and skips excluded owner", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner@example.com",
    });
    const follower = await User.create({
      name: "Follower",
      email: "follower@example.com",
    });
    const lateFollower = await User.create({
      name: "Late Follower",
      email: "late@example.com",
    });

    const building = await Building.create({
      name: "Sky Residence",
      isActive: true,
      minRent: 5500,
      maxRent: 7000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listing = await Listing.create(
      createListing({
        buildingId: building._id,
        listedBy: owner._id,
      }),
    );

    const occurredAt = new Date("2026-08-01T10:00:00.000Z");

    await BuildingFollow.create([
      {
        userId: follower._id,
        buildingId: building._id,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
      },
      {
        userId: owner._id,
        buildingId: building._id,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
      },
      {
        userId: lateFollower._id,
        buildingId: building._id,
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
      },
    ]);

    const published = [];
    setWorkerRuntimeContext({
      publishRealtimeHint: async (hint) => {
        published.push(hint);
      },
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "job-1",
      data: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: building._id.toString(),
        occurredAt: occurredAt.toISOString(),
        listings: [
          {
            listingId: listing._id.toString(),
            rent: 5500,
            availableAt: null,
            occurredAt: occurredAt.toISOString(),
            excludeUserId: owner._id.toString(),
          },
        ],
        metadata: {
          buildingName: building.name,
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
    assert.equal(result.sent, 1);
    assert.equal(result.requested, 1);
    assert.equal(published.length, 1);

    const notifications = await Notification.find().lean();
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0]?.recipient.toString(), follower._id.toString());
    assert.equal(
      notifications[0]?.type,
      NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING,
    );
    assert.equal(
      notifications[0]?.entityType,
      NOTIFICATION_ENTITY_TYPES.LISTING,
    );
    assert.equal(notifications[0]?.entityId.toString(), listing._id.toString());
  });

  test("merges three listings into one plural notification per follower", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner-merge@example.com",
    });
    const follower = await User.create({
      name: "Follower",
      email: "follower-merge@example.com",
    });

    const building = await Building.create({
      name: "Merge Tower",
      isActive: true,
      minRent: 5000,
      maxRent: 7000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listings = await Listing.create(
      [5000, 5200, 5400].map((rent) =>
        createListing({
          buildingId: building._id,
          listedBy: owner._id,
          rent,
        }),
      ),
    );

    await BuildingFollow.create({
      userId: follower._id,
      buildingId: building._id,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    setWorkerRuntimeContext({
      publishRealtimeHint: async () => {},
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "job-merge",
      data: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: building._id.toString(),
        occurredAt: "2026-08-01T12:00:00.000Z",
        listings: listings.map((listing, index) => ({
          listingId: listing._id.toString(),
          rent: listing.rent,
          availableAt: null,
          occurredAt: `2026-08-01T10:0${index}:00.000Z`,
          excludeUserId: owner._id.toString(),
        })),
        metadata: {
          buildingName: building.name,
        },
      },
    });

    assert.equal(result.sent, 1);
    assert.equal(result.listingCount, 3);

    const [notification] = await Notification.find().lean();
    assert.match(notification.title, /3 new listings at Merge Tower/);
    assert.match(notification.message, /3 new listings are now available/);
    assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
    assert.equal(notification.metadata.listingCount, 3);
  });

  test("skips stale price drop jobs when rent no longer dropped", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner2@example.com",
    });

    const building = await Building.create({
      name: "Stale Tower",
      isActive: true,
      minRent: 7000,
      maxRent: 7000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "job-2",
      data: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId: building._id.toString(),
        occurredAt: new Date().toISOString(),
        metadata: {
          buildingName: building.name,
          oldMinRent: 7000,
          newMinRent: 5500,
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "stale_event");

    const notifications = await Notification.find().lean();
    assert.equal(notifications.length, 0);
  });
});
