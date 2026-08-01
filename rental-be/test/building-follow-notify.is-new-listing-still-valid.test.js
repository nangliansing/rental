import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import Building from "../modules/building/building.model.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { isNewListingFollowerNotifyStillValid } from "../modules/building-follow-notify/utils/verify-building-followers-notify-event.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import User from "../modules/user/user.model.js";

let mongoServer;
let owner;

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

const createListingEntry = (listingId, overrides = {}) => ({
  listingId,
  rent: 5500,
  availableAt: null,
  occurredAt: OCCURRED_AT,
  ...overrides,
});

const createNewListingEvent = ({
  buildingId,
  listings,
  buildingName = "New Listing Tower",
} = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId,
  occurredAt: OCCURRED_AT,
  excludeUserIds: [],
  listings,
  metadata: {
    buildingName,
  },
});

const createBuilding = async ({ isActive = true, name = "New Listing Tower" } = {}) =>
  Building.create({
    name,
    isActive,
    minRent: 5000,
    maxRent: 7000,
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
    mongoServer.getUri("building_follow_new_listing_stale_test"),
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

describe("isNewListingFollowerNotifyStillValid", () => {
  describe("returns false when the building cannot be notified", () => {
    test("rejects a missing building", async () => {
      const missingBuildingId = new mongoose.Types.ObjectId();
      const listingId = new mongoose.Types.ObjectId();

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: missingBuildingId,
            listings: [createListingEntry(listingId)],
          }),
        ),
        false,
      );
    });

    test("rejects an inactive building", async () => {
      const building = await createBuilding({ isActive: false });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        false,
      );
    });
  });

  describe("returns false when no eligible public listings remain", () => {
    test("rejects an empty listings array", async () => {
      const building = await createBuilding();

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [],
          }),
        ),
        false,
      );
    });

    test("rejects when every referenced listing was deleted", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          isDeleted: true,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        false,
      );
    });

    test("rejects when every referenced listing is private", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        false,
      );
    });

    test("rejects when the listing belongs to a different building", async () => {
      const building = await createBuilding();
      const otherBuilding = await createBuilding({ name: "Other Tower" });
      const listing = await Listing.create(
        createListingRecord({
          buildingId: otherBuilding._id,
          listedBy: owner._id,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        false,
      );
    });

    test("rejects when the job references listing ids that no longer exist", async () => {
      const building = await createBuilding();
      const missingListingId = new mongoose.Types.ObjectId();

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(missingListingId)],
          }),
        ),
        false,
      );
    });

    test("rejects when a merged batch no longer has any eligible listings", async () => {
      const building = await createBuilding();
      const deletedListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          isDeleted: true,
        }),
      );
      const privateListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [
              createListingEntry(deletedListing._id),
              createListingEntry(privateListing._id),
            ],
          }),
        ),
        false,
      );
    });
  });

  describe("returns true when at least one eligible public listing remains", () => {
    test("accepts a single public listing on an active building", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        true,
      );
    });

    test("accepts when only one listing in a merged batch is still eligible", async () => {
      const building = await createBuilding();
      const publicListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );
      const privateListing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          visibility: LISTING_VISIBILITIES.PRIVATE,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [
              createListingEntry(publicListing._id),
              createListingEntry(privateListing._id),
            ],
          }),
        ),
        true,
      );
    });

    test("accepts a public listing even when its availableAt is in the future", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
          availableAt: new Date("2026-12-01T00:00:00.000Z"),
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        true,
      );
    });

    test("accepts buildings that are active by default", async () => {
      const building = await Building.create({
        name: "Default Active Tower",
        minRent: 5000,
        maxRent: 7000,
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

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        true,
      );
    });
  });

  describe("accepts both ObjectId and string identifiers", () => {
    test("loads the building when buildingId is an ObjectId", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id,
            listings: [createListingEntry(listing._id)],
          }),
        ),
        true,
      );
    });

    test("loads the building and listings when ids are strings", async () => {
      const building = await createBuilding();
      const listing = await Listing.create(
        createListingRecord({
          buildingId: building._id,
          listedBy: owner._id,
        }),
      );

      assert.equal(
        await isNewListingFollowerNotifyStillValid(
          createNewListingEvent({
            buildingId: building._id.toString(),
            listings: [createListingEntry(listing._id.toString())],
          }),
        ),
        true,
      );
    });
  });
});
