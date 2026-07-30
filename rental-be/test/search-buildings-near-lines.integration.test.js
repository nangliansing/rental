import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import AgentProfile from "../modules/agent/agent-profile.model.js";
import Building from "../modules/building/building.model.js";
import Listing from "../modules/listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import SavedListing from "../modules/saved-listing/saved-listing.model.js";
import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import { searchBuildingsNearLinesService } from "../modules/search/services/index.js";
import User from "../modules/user/user.model.js";
import { USER_STATUSES } from "../modules/user/user.constants.js";

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("near_lines_search_test"), {
    autoIndex: false,
  });
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Promise.all([
    AgentProfile.createIndexes(),
    Building.createIndexes(),
    Listing.createIndexes(),
    SavedListing.createIndexes(),
    BuildingFollow.createIndexes(),
    User.createIndexes(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

const createBuilding = (overrides = {}) =>
  Building.create({
    name: "Building near route",
    location: { type: "Point", coordinates: [100.501, 13.75] },
    minRent: null,
    maxRent: null,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

let userSequence = 0;

const createUser = (overrides = {}) => {
  userSequence += 1;
  return User.create({
    name: `Search User ${userSequence}`,
    email: `search-user-${userSequence}@example.com`,
    ...overrides,
  });
};

const createEligibleListing = async ({
  building,
  listingOverrides = {},
  profileOverrides = {},
  userOverrides = {},
} = {}) => {
  const lister = await createUser(userOverrides);
  const profile = await AgentProfile.create({
    userId: lister._id,
    displayName: `Agent ${userSequence}`,
    supportLanguages: ["English"],
    ...profileOverrides,
  });
  const listing = await Listing.create({
    visibility: LISTING_VISIBILITIES.PUBLIC,
    isForeignerAccepted: true,
    isTM30Provided: true,
    rent: 15_000,
    deposit: 15_000,
    moveInCost: 30_000,
    bedroomCount: 1,
    bathroomCount: 1,
    kitchenType: "Kitchen",
    contractMonths: 6,
    occupancy: 2,
    isCookingAllowed: true,
    isPetAllowed: false,
    facilities: ["Air Conditioner"],
    listedBy: lister._id,
    buildingId: building._id,
    ...listingOverrides,
  });

  return { lister, listing, profile };
};

const baseBody = {
  geometry: {
    type: "LineString",
    coordinates: [
      [100.5, 13.75],
      [100.51, 13.75],
    ],
  },
  distanceMeters: 500,
  page: 1,
  limit: 20,
  includeBuildingsWithoutMatchingListings: true,
};

describe("search buildings near lines service", () => {
  test("returns only active buildings in the line buffer with a 2dsphere index", async () => {
    const [nearBuilding] = await Promise.all([
      createBuilding(),
      createBuilding({
        name: "Building outside route buffer",
        location: { type: "Point", coordinates: [100.7, 13.9] },
      }),
      createBuilding({ name: "Inactive building", isActive: false }),
    ]);

    const result = await searchBuildingsNearLinesService({
      bodyInput: baseBody,
    });

    assert.equal(result.pagination.total, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]._id.toString(), nearBuilding._id.toString());
    assert.deepEqual(result.data[0].listings, []);

    const indexes = await Building.collection.indexes();
    assert.ok(
      indexes.some((index) => index.key.location === "2dsphere"),
    );
  });

  test("requires a matching listing unless empty buildings are requested", async () => {
    await createBuilding();

    const result = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        includeBuildingsWithoutMatchingListings: false,
      },
    });

    assert.deepEqual(result.data, []);
    assert.equal(result.pagination.total, 0);
  });

  test("searches across every component of a MultiLineString", async () => {
    const building = await createBuilding({
      name: "Building near second line",
      location: { type: "Point", coordinates: [100.601, 13.8] },
    });

    const result = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [100.5, 13.75],
              [100.51, 13.75],
            ],
            [
              [100.6, 13.8],
              [100.61, 13.8],
            ],
          ],
        },
      },
    });

    assert.equal(result.pagination.total, 1);
    assert.equal(result.data[0]._id.toString(), building._id.toString());
  });

  test("does not duplicate a building covered by multiple line components", async () => {
    const building = await createBuilding();

    const result = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [100.5, 13.75],
              [100.51, 13.75],
            ],
            [
              [100.501, 13.749],
              [100.501, 13.751],
            ],
          ],
        },
      },
    });

    assert.equal(result.pagination.total, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]._id.toString(), building._id.toString());
  });

  test("honors the requested buffer distance", async () => {
    const inside = await createBuilding({
      name: "Inside 500 meter corridor",
      location: { type: "Point", coordinates: [100.505, 13.753] },
    });
    await createBuilding({
      name: "Outside 500 meter corridor",
      location: { type: "Point", coordinates: [100.505, 13.756] },
    });

    const result = await searchBuildingsNearLinesService({
      bodyInput: baseBody,
    });

    assert.equal(result.pagination.total, 1);
    assert.equal(result.data[0]._id.toString(), inside._id.toString());
  });

  test("reuses building filters and paginates the complete result", async () => {
    await Promise.all([
      createBuilding({
        name: "Condo A",
        buildingType: "Condo",
        facilities: ["Parking"],
        location: { type: "Point", coordinates: [100.501, 13.75] },
      }),
      createBuilding({
        name: "Condo B",
        buildingType: "Condo",
        facilities: ["Parking"],
        location: { type: "Point", coordinates: [100.502, 13.75] },
      }),
      createBuilding({
        name: "Filtered apartment",
        buildingType: "Apartment",
        location: { type: "Point", coordinates: [100.503, 13.75] },
      }),
    ]);

    const firstPage = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        buildingType: "Condo",
        buildingFacilities: ["Parking"],
        limit: 1,
      },
    });
    const secondPage = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        buildingType: "Condo",
        buildingFacilities: ["Parking"],
        page: 2,
        limit: 1,
      },
    });

    assert.equal(firstPage.pagination.total, 2);
    assert.equal(firstPage.data.length, 1);
    assert.equal(secondPage.pagination.total, 2);
    assert.equal(secondPage.data.length, 1);
    assert.notEqual(
      firstPage.data[0]._id.toString(),
      secondPage.data[0]._id.toString(),
    );
  });

  test("populates eligible listings, applies listing filters, and marks saved listings", async () => {
    const building = await createBuilding({ minRent: 15_000, maxRent: 20_000 });
    const { listing, lister } = await createEligibleListing({ building });
    await createEligibleListing({
      building,
      listingOverrides: { rent: 25_000 },
    });
    const viewer = await createUser();
    await SavedListing.create({
      userId: viewer._id,
      listingId: listing._id,
      buildingId: building._id,
      listedBy: lister._id,
      snapshot: {
        rent: listing.rent,
        visibility: listing.visibility,
        buildingName: building.name,
      },
    });

    const anonymousResult = await searchBuildingsNearLinesService({
      bodyInput: { ...baseBody, includeBuildingsWithoutMatchingListings: false },
    });
    const viewerResult = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        minRent: 14_000,
        maxRent: 16_000,
        supportLanguages: ["English"],
        includeBuildingsWithoutMatchingListings: false,
      },
      viewerUserId: viewer._id.toString(),
    });

    assert.equal(anonymousResult.data[0].listings.length, 2);
    assert.ok(
      anonymousResult.data[0].listings.every(
        (resultListing) => resultListing.isSavedByMe === false,
      ),
    );
    assert.equal(viewerResult.data[0].listings.length, 1);
    assert.equal(viewerResult.data[0].listings[0].rent, 15_000);
    assert.equal(viewerResult.data[0].listings[0].isSavedByMe, true);
  });

  test("calculates isFollowing for the viewer on each returned building", async () => {
    const building = await createBuilding({ minRent: 10_000, maxRent: 20_000 });
    await createEligibleListing({ building });
    const viewer = await createUser();
    await BuildingFollow.create({
      userId: viewer._id,
      buildingId: building._id,
    });

    const [anonymousResult, viewerResult] = await Promise.all([
      searchBuildingsNearLinesService({
        bodyInput: baseBody,
      }),
      searchBuildingsNearLinesService({
        bodyInput: baseBody,
        viewerUserId: viewer._id.toString(),
      }),
    ]);

    assert.equal(anonymousResult.data.length, 1);
    assert.equal(anonymousResult.data[0].isFollowing, false);
    assert.equal(viewerResult.data.length, 1);
    assert.equal(viewerResult.data[0].isFollowing, true);
  });

  test("excludes private, deleted, and ineligible-lister listings", async () => {
    const building = await createBuilding({ minRent: 10_000, maxRent: 20_000 });
    await Promise.all([
      createEligibleListing({
        building,
        listingOverrides: { visibility: LISTING_VISIBILITIES.PRIVATE },
      }),
      createEligibleListing({
        building,
        listingOverrides: { isDeleted: true },
      }),
      createEligibleListing({
        building,
        userOverrides: { status: USER_STATUSES.SUSPENDED },
      }),
      createEligibleListing({
        building,
        profileOverrides: { isDeleted: true },
      }),
    ]);

    const result = await searchBuildingsNearLinesService({
      bodyInput: {
        ...baseBody,
        includeBuildingsWithoutMatchingListings: false,
      },
    });

    assert.deepEqual(result.data, []);
    assert.equal(result.pagination.total, 0);
  });
});
