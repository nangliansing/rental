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
import NotificationDedupe from "../modules/notification/notification-dedupe.model.js";
import User from "../modules/user/user.model.js";
import {
  resetWorkerRuntimeContextForTests,
  setWorkerRuntimeContext,
} from "../shared/queue/worker-context.js";

let mongoServer;

const FOLLOWER_COUNT = 1_500;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("building_follow_notify_stress_test"));
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

describe("building follower notification stress scenarios", () => {
  test("delivers one merged notification each to 1500 followers", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner-stress@example.com",
    });

    const building = await Building.create({
      name: "High Rise",
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
      [5000, 5200, 5400].map((rent) => ({
        buildingId: building._id,
        listedBy: owner._id,
        rent,
        deposit: rent,
        moveInCost: rent * 2,
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
      })),
    );

    const followerUsers = await User.insertMany(
      Array.from({ length: FOLLOWER_COUNT }, (_, index) => ({
        name: `Follower ${index + 1}`,
        email: `follower-stress-${index + 1}@example.com`,
      })),
    );

    await BuildingFollow.insertMany(
      followerUsers.map((user) => ({
        userId: user._id,
        buildingId: building._id,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
      })),
    );

    let publishedCount = 0;
    setWorkerRuntimeContext({
      publishRealtimeHint: async () => {
        publishedCount += 1;
      },
    });

    const startedAt = Date.now();

    const result = await handleBuildingFollowersNotifyJob({
      id: "stress-job",
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

    const elapsedMs = Date.now() - startedAt;

    assert.equal(result.requested, FOLLOWER_COUNT);
    assert.equal(result.sent, FOLLOWER_COUNT);
    assert.equal(result.skippedDuplicate, 0);
    assert.equal(result.skippedInvalid, 0);
    assert.equal(result.listingCount, 3);
    assert.equal(publishedCount, FOLLOWER_COUNT);

    const [notificationCount, dedupeCount] = await Promise.all([
      Notification.countDocuments(),
      NotificationDedupe.countDocuments(),
    ]);

    assert.equal(notificationCount, FOLLOWER_COUNT);
    assert.equal(dedupeCount, FOLLOWER_COUNT);

    const sample = await Notification.findOne().lean();
    assert.match(sample.title, /3 new listings at High Rise/);
    assert.equal(sample.metadata.listingCount, 3);

    assert.ok(
      elapsedMs < 30_000,
      `expected stress run under 30s, took ${elapsedMs}ms`,
    );
  });

  test("dedupes repeated job delivery for the same follower batch", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner-dedupe@example.com",
    });
    const follower = await User.create({
      name: "Follower",
      email: "follower-dedupe@example.com",
    });

    const building = await Building.create({
      name: "Dedupe Tower",
      isActive: true,
      minRent: 5000,
      maxRent: 5000,
      createdBy: owner._id,
      location: {
        type: "Point",
        coordinates: [100.5018, 13.7563],
      },
    });

    const listing = await Listing.create({
      buildingId: building._id,
      listedBy: owner._id,
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
    });

    await BuildingFollow.create({
      userId: follower._id,
      buildingId: building._id,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    setWorkerRuntimeContext({
      publishRealtimeHint: async () => {},
    });

    const jobData = {
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId: building._id.toString(),
      occurredAt: "2026-08-01T12:00:00.000Z",
      listings: [
        {
          listingId: listing._id.toString(),
          rent: 5000,
          availableAt: null,
          occurredAt: "2026-08-01T10:00:00.000Z",
          excludeUserId: owner._id.toString(),
        },
      ],
      metadata: {
        buildingName: building.name,
      },
    };

    const first = await handleBuildingFollowersNotifyJob({
      id: "dedupe-job-1",
      data: jobData,
    });
    const second = await handleBuildingFollowersNotifyJob({
      id: "dedupe-job-2",
      data: jobData,
    });

    assert.equal(first.sent, 1);
    assert.equal(second.sent, 0);
    assert.equal(second.skippedDuplicate, 1);
    assert.equal(await Notification.countDocuments(), 1);
  });
});
