import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { isPriceDropFollowerNotifyStillValid } from "../modules/building-follow-notify/utils/verify-building-followers-notify-event.js";
import User from "../modules/user/user.model.js";

let mongoServer;
let owner;

const createPriceDropEvent = ({
  buildingId,
  oldMinRent,
  newMinRent,
  buildingName = "Test Tower",
} = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
  buildingId,
  occurredAt: new Date("2026-08-01T10:00:00.000Z"),
  excludeUserIds: [],
  listings: [],
  metadata: {
    buildingName,
    oldMinRent,
    newMinRent,
  },
});

const createBuilding = async ({ minRent, isActive = true } = {}) =>
  Building.create({
    name: "Price Drop Tower",
    isActive,
    minRent,
    maxRent: Math.max(minRent ?? 0, 7000),
    createdBy: owner._id,
    location: {
      type: "Point",
      coordinates: [100.5018, 13.7563],
    },
  });

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(
    mongoServer.getUri("building_follow_price_drop_stale_test"),
  );
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  owner = await User.create({
    name: "Owner",
    email: `owner-${Date.now()}@example.com`,
  });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("isPriceDropFollowerNotifyStillValid", () => {
  describe("returns false when the building cannot be notified", () => {
    test("rejects a missing building", async () => {
      const missingBuildingId = new mongoose.Types.ObjectId();

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: missingBuildingId,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });

    test("rejects an inactive building", async () => {
      const building = await createBuilding({
        minRent: 5500,
        isActive: false,
      });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });
  });

  describe("returns true when current min rent is at or below the announced newMinRent", () => {
    test("accepts the exact announced min rent after debounce", async () => {
      const building = await createBuilding({ minRent: 5500 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id.toString(),
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });

    test("accepts a further drop below the announced newMinRent", async () => {
      const building = await createBuilding({ minRent: 5200 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });

    test("accepts zero min rent when the job announced a drop to zero", async () => {
      const building = await createBuilding({ minRent: 0 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 5000,
            newMinRent: 0,
          }),
        ),
        true,
      );
    });
  });

  describe("returns true when rent recovered partially but still meaningfully dropped", () => {
    test("accepts a partial recovery that remains above the announced newMinRent", async () => {
      const building = await createBuilding({ minRent: 5600 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });

    test("accepts a live drop exactly at the minimum threshold from oldMinRent", async () => {
      const building = await createBuilding({ minRent: 6900 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });
  });

  describe("returns false when the drop is fully reversed or too small", () => {
    test("rejects when min rent returned to the original level", async () => {
      const building = await createBuilding({ minRent: 7000 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });

    test("rejects when min rent increased above the original level", async () => {
      const building = await createBuilding({ minRent: 7500 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });

    test("rejects a partial recovery that no longer meets the minimum drop threshold", async () => {
      const building = await createBuilding({ minRent: 6940 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });

    test("rejects when live min rent is above the announced newMinRent and the remaining drop is too small", async () => {
      const building = await createBuilding({ minRent: 5501 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 5600,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });
  });

  describe("handles missing or invalid rent metadata safely", () => {
    test("rejects when live min rent is missing", async () => {
      const building = await createBuilding({ minRent: null });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        false,
      );
    });

    test("accepts when oldMinRent is missing but live min rent still matches announced newMinRent", async () => {
      const building = await createBuilding({ minRent: 5500 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
          buildingId: building._id,
          occurredAt: new Date(),
          excludeUserIds: [],
          listings: [],
          metadata: {
            newMinRent: 5500,
          },
        }),
        true,
      );
    });

    test("rejects when oldMinRent is missing and live min rent no longer matches the snapshot", async () => {
      const building = await createBuilding({ minRent: 5600 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
          buildingId: building._id,
          occurredAt: new Date(),
          excludeUserIds: [],
          listings: [],
          metadata: {
            newMinRent: 5500,
          },
        }),
        false,
      );
    });

    test("rejects when job metadata is missing newMinRent and live rent recovered above oldMinRent", async () => {
      const building = await createBuilding({ minRent: 7000 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
          buildingId: building._id,
          occurredAt: new Date(),
          excludeUserIds: [],
          listings: [],
          metadata: {
            oldMinRent: 7000,
          },
        }),
        false,
      );
    });
  });

  describe("accepts both ObjectId and string building ids", () => {
    test("loads the building when buildingId is an ObjectId", async () => {
      const building = await createBuilding({ minRent: 5500 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id,
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });

    test("loads the building when buildingId is a string", async () => {
      const building = await createBuilding({ minRent: 5400 });

      assert.equal(
        await isPriceDropFollowerNotifyStillValid(
          createPriceDropEvent({
            buildingId: building._id.toString(),
            oldMinRent: 7000,
            newMinRent: 5500,
          }),
        ),
        true,
      );
    });
  });
});
