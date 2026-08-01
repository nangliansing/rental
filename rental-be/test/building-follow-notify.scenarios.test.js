import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { handleBuildingFollowersNotifyJob } from "../modules/building-follow-notify/handlers/building-followers-notify.handler.js";
import {
  maybeEnqueueBuildingFollowerNewListing,
  maybeEnqueueBuildingFollowerPriceDrop,
} from "../modules/building-follow-notify/services/enqueue-building-followers-notify.service.js";
import {
  buildBuildingFollowersNotifyJobId,
  buildFollowerDedupeKey,
} from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import {
  validateBuildingFollowersNotifyEvent,
  validateBuildingFollowersNotifyOptions,
} from "../modules/building-follow-notify/validate-building-followers-notify-event.js";
import { updateBuildingRentSummaryService } from "../modules/building/services/update-building-rent-summary.service.js";
import { ownerUpdateListingService } from "../modules/listing/services/owner-update-listing.service.js";
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
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

let replSet;

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

before(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });

  await mongoose.connect(replSet.getUri("building_follow_notify_scenarios_test"));
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  resetWorkerRuntimeContextForTests();
});

after(async () => {
  resetWorkerRuntimeContextForTests();
  await mongoose.disconnect();
  await replSet?.stop();
});

describe("building follower notify production scenarios", () => {
  test("defaults debounce to five minutes when env is unset", () => {
    assert.equal(BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS, 5 * 60 * 1000);

    const options = validateBuildingFollowersNotifyOptions();
    assert.equal(options.delayMs, 5 * 60 * 1000);
  });

  test("uses one mergeable job id per building and change type", () => {
    const buildingId = new mongoose.Types.ObjectId();

    assert.equal(
      buildBuildingFollowersNotifyJobId({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
      }),
      `building.followers.notify-${buildingId.toString()}-NEW_LISTING`,
    );

    assert.equal(
      buildBuildingFollowersNotifyJobId({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId,
      }),
      `building.followers.notify-${buildingId.toString()}-PRICE_DROPPED`,
    );
  });

  test("uses one dedupe key per follower per building event batch", () => {
    const buildingId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const listingId = new mongoose.Types.ObjectId();

    assert.equal(
      buildFollowerDedupeKey({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
        userId,
        listings: [{ listingId }],
      }),
      `followed-building.new-listing.${buildingId.toString()}.${userId.toString()}.${listingId.toString()}`,
    );

    assert.equal(
      buildFollowerDedupeKey({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId,
        userId,
        newMinRent: 4500,
      }),
      `followed-building.rent-drop.${buildingId.toString()}.${userId.toString()}.4500`,
    );
  });

  test("maybeEnqueue helpers are safe when the queue is disabled", async () => {
    const buildingId = new mongoose.Types.ObjectId();

    const priceDrop = await maybeEnqueueBuildingFollowerPriceDrop({
      buildingId,
      buildingName: "Tower",
      oldMinRent: 7000,
      newMinRent: 5500,
    });

    assert.equal(priceDrop.enqueued, false);
    assert.equal(priceDrop.reason, "disabled");

    const newListing = await maybeEnqueueBuildingFollowerNewListing({
      listing: {
        _id: new mongoose.Types.ObjectId(),
        buildingId,
        listedBy: new mongoose.Types.ObjectId(),
        visibility: LISTING_VISIBILITIES.PUBLIC,
        isDeleted: false,
        rent: 5000,
      },
      buildingName: "Tower",
    });

    assert.equal(newListing.enqueued, false);
    assert.equal(newListing.reason, "disabled");
  });

  test("owner rent update recalculates building minRent inside a transaction", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner-scenario@example.com",
    });

    const building = await Building.create({
      name: "Scenario Tower",
      minRent: 5000,
      maxRent: 5000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listing = await Listing.create(
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 5000,
      }),
    );

    await ownerUpdateListingService({
      listingId: listing._id,
      actorId: owner._id,
      body: { rent: 4000 },
    });

    const updatedBuilding = await Building.findById(building._id).lean();
    assert.equal(updatedBuilding.minRent, 4000);
    assert.equal(updatedBuilding.maxRent, 4000);
  });

  test("rent summary uses the lowest public listing rent across multiple listings", async () => {
    const owner = await User.create({
      name: "Owner Two",
      email: "owner-scenario-two@example.com",
    });

    const building = await Building.create({
      name: "Multi Listing Tower",
      minRent: null,
      maxRent: null,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    await Listing.create([
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 6000,
      }),
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 4000,
      }),
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 5500,
        visibility: LISTING_VISIBILITIES.PRIVATE,
      }),
    ]);

    const updatedBuilding = await updateBuildingRentSummaryService(building._id);

    assert.equal(updatedBuilding.minRent, 4000);
    assert.equal(updatedBuilding.maxRent, 6000);
  });

  test("delivers a price drop notification when rent summary still reflects the drop", async () => {
    const owner = await User.create({
      name: "Owner Three",
      email: "owner-scenario-three@example.com",
    });
    const follower = await User.create({
      name: "Follower",
      email: "follower-scenario@example.com",
    });

    const building = await Building.create({
      name: "Price Drop Tower",
      isActive: true,
      minRent: 5500,
      maxRent: 7000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    await BuildingFollow.create({
      userId: follower._id,
      buildingId: building._id,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    setWorkerRuntimeContext({
      publishRealtimeHint: async () => {},
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "price-drop-job",
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

    assert.equal(result.skipped, false);
    assert.equal(result.sent, 1);

    const [notification] = await Notification.find().lean();
    assert.equal(notification.type, NOTIFICATION_TYPES.FOLLOWED_BUILDING_PRICE_DROPPED);
    assert.equal(notification.entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
    assert.match(notification.message, /5,500 THB\/month/);
  });

  test("skips delivery for inactive buildings", async () => {
    const owner = await User.create({
      name: "Owner Four",
      email: "owner-scenario-four@example.com",
    });
    const follower = await User.create({
      name: "Follower Two",
      email: "follower-scenario-two@example.com",
    });

    const building = await Building.create({
      name: "Inactive Tower",
      isActive: false,
      minRent: 5000,
      maxRent: 5000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listing = await Listing.create(
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
      }),
    );

    await BuildingFollow.create({
      userId: follower._id,
      buildingId: building._id,
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "inactive-job",
      data: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: building._id.toString(),
        occurredAt: new Date().toISOString(),
        listings: [
          {
            listingId: listing._id.toString(),
            rent: 5000,
            availableAt: null,
            occurredAt: new Date().toISOString(),
          },
        ],
        metadata: { buildingName: building.name },
      },
    });

    assert.equal(result.skipped, true);
    assert.equal(await Notification.countDocuments(), 0);
  });

  test("sends partial merged counts when a follower followed mid-batch", async () => {
    const owner = await User.create({
      name: "Owner Five",
      email: "owner-scenario-five@example.com",
    });
    const earlyFollower = await User.create({
      name: "Early Follower",
      email: "early-follower@example.com",
    });
    const lateFollower = await User.create({
      name: "Late Follower",
      email: "late-follower@example.com",
    });

    const building = await Building.create({
      name: "Partial Merge Tower",
      isActive: true,
      minRent: 5000,
      maxRent: 6000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
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

    await BuildingFollow.create([
      {
        userId: earlyFollower._id,
        buildingId: building._id,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
      },
      {
        userId: lateFollower._id,
        buildingId: building._id,
        createdAt: new Date("2026-08-01T10:06:00.000Z"),
      },
    ]);

    setWorkerRuntimeContext({
      publishRealtimeHint: async () => {},
    });

    const result = await handleBuildingFollowersNotifyJob({
      id: "partial-merge-job",
      data: validateBuildingFollowersNotifyEvent({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId: building._id,
        occurredAt: "2026-08-01T10:10:00.000Z",
        listings: listings.map((listing, index) => ({
          listingId: listing._id,
          rent: listing.rent,
          availableAt: null,
          occurredAt:
            index < 2
              ? `2026-08-01T10:0${index}:00.000Z`
              : "2026-08-01T10:07:00.000Z",
          excludeUserId: owner._id,
        })),
        metadata: { buildingName: building.name },
      }),
    });

    assert.equal(result.sent, 2);

    const notifications = await Notification.find().sort({ recipient: 1 }).lean();
    const byRecipient = new Map(
      notifications.map((notification) => [
        notification.recipient.toString(),
        notification,
      ]),
    );

    assert.match(
      byRecipient.get(earlyFollower._id.toString()).title,
      /3 new listings/,
    );
    assert.match(
      byRecipient.get(lateFollower._id.toString()).title,
      /New listing at Partial Merge Tower/,
    );
  });

  test("delivers available-again notification when availability changes to now", async () => {
    const owner = await User.create({
      name: "Owner Six",
      email: "owner-scenario-six@example.com",
    });
    const follower = await User.create({
      name: "Follower Three",
      email: "follower-scenario-three@example.com",
    });

    const building = await Building.create({
      name: "Available Again Tower",
      isActive: true,
      minRent: 5000,
      maxRent: 5000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listing = await Listing.create(
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 5000,
        availableAt: startOfCalendarDayInTimeZone("2026-08-15"),
      }),
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
      id: "available-again-job",
      data: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
        buildingId: building._id.toString(),
        occurredAt: new Date().toISOString(),
        listings: [
          {
            listingId: listing._id.toString(),
            rent: 5000,
            availableAt: startOfCalendarDayInTimeZone("2026-08-15").toISOString(),
            occurredAt: new Date().toISOString(),
            becamePublic: false,
            availabilityChanged: true,
          },
        ],
        metadata: { buildingName: building.name },
      },
    });

    assert.equal(result.skipped, false);
    assert.equal(result.sent, 1);

    const [notification] = await Notification.find().lean();
    assert.equal(
      notification.type,
      NOTIFICATION_TYPES.FOLLOWED_BUILDING_AVAILABLE_AGAIN,
    );
    assert.match(notification.message, /available again/i);
  });
});
