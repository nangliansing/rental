import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import { updateBuildingRentSummaryService } from "../modules/building/services/update-building-rent-summary.service.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import User from "../modules/user/user.model.js";

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

  await mongoose.connect(replSet.getUri("update_building_rent_summary_test"));
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe("updateBuildingRentSummaryService", () => {
  test("updates minRent inside a transaction after a listing rent change", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "owner-rent-summary@example.com",
    });

    const building = await Building.create({
      name: "Rent Summary Tower",
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

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Listing.findByIdAndUpdate(
          listing._id,
          { $set: { rent: 4000 } },
          { session, returnDocument: "after" },
        );

        const updatedBuilding = await updateBuildingRentSummaryService(
          building._id,
          session,
        );

        assert.equal(updatedBuilding.minRent, 4000);
        assert.equal(updatedBuilding.maxRent, 4000);
      });
    } finally {
      await session.endSession();
    }

    const persistedBuilding = await Building.findById(building._id).lean();
    assert.equal(persistedBuilding.minRent, 4000);
    assert.equal(persistedBuilding.maxRent, 4000);
  });

  test("clears minRent when the last public listing becomes private", async () => {
    const owner = await User.create({
      name: "Owner Two",
      email: "owner-rent-summary-two@example.com",
    });

    const building = await Building.create({
      name: "Private Tower",
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

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Listing.findByIdAndUpdate(
          listing._id,
          { $set: { visibility: LISTING_VISIBILITIES.PRIVATE } },
          { session, returnDocument: "after" },
        );

        const updatedBuilding = await updateBuildingRentSummaryService(
          building._id,
          session,
        );

        assert.equal(updatedBuilding.minRent, null);
        assert.equal(updatedBuilding.maxRent, null);
      });
    } finally {
      await session.endSession();
    }
  });

  test("ignores zero-rent listings when computing minRent", async () => {
    const owner = await User.create({
      name: "Owner Three",
      email: "owner-rent-summary-three@example.com",
    });

    const building = await Building.create({
      name: "Zero Rent Tower",
      minRent: 5500,
      maxRent: 5500,
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
        rent: 5500,
      }),
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 3000,
      }),
      createListingRecord({
        buildingId: building._id,
        listedBy: owner._id,
        rent: 0,
      }),
    ]);

    const updatedBuilding = await updateBuildingRentSummaryService(building._id);

    assert.equal(updatedBuilding.minRent, 3000);
    assert.equal(updatedBuilding.maxRent, 5500);
  });
});
