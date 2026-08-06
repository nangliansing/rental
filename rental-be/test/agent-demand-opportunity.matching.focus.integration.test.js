import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import { BUILDING_TYPES } from "../modules/building/building.constants.js";
import { KITCHEN_TYPES, LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { USER_STATUSES } from "../modules/user/user.constants.js";
import { countMatchingBuildingsForOpportunity } from "../modules/agent-demand-opportunity/services/count-matching-buildings-for-opportunity.service.js";
import { buildMatchingBuildingClassificationsPipeline } from "../modules/agent-demand-opportunity/pipelines/build-matching-building-classifications.pipeline.js";

process.env.NODE_ENV = "test";
delete process.env.MONGODB_URI;

let AgentProfile;
let Building;
let Listing;
let User;
let replSet;

const coverage = {
  type: "Polygon",
  coordinates: [[
    [100.62, 13.75],
    [100.66, 13.75],
    [100.66, 13.78],
    [100.62, 13.78],
    [100.62, 13.75],
  ]],
};

const createAgent = async ({
  status = USER_STATUSES.ACTIVE,
  supportLanguages = ["English"],
  isDeleted = false,
} = {}) => {
  const user = await User.create({
    name: "Focused matching agent",
    email: `${new mongoose.Types.ObjectId()}@example.com`,
    status,
  });
  const profile = await AgentProfile.create({
    userId: user._id,
    displayName: "Focused matching agent",
    supportLanguages,
    isDeleted,
  });
  return { profile, user };
};

const createBuilding = (createdBy, overrides = {}) =>
  Building.create({
    name: `Focused building ${new mongoose.Types.ObjectId()}`,
    buildingType: BUILDING_TYPES.APARTMENT,
    facilities: ["Lift", "Pool"],
    security: ["CCTV", "Keycard"],
    location: { type: "Point", coordinates: [100.64, 13.765] },
    createdBy,
    ...overrides,
  });

const createListing = (buildingId, listedBy, overrides = {}) =>
  Listing.create({
    buildingId,
    listedBy,
    visibility: LISTING_VISIBILITIES.PUBLIC,
    isForeignerAccepted: true,
    isTM30Provided: true,
    rent: 20_000,
    deposit: 20_000,
    moveInCost: 40_000,
    bedroomCount: 2,
    bathroomCount: 2,
    kitchenType: KITCHEN_TYPES.KITCHEN,
    contractMonths: 6,
    occupancy: 3,
    isCookingAllowed: true,
    isPetAllowed: true,
    facilities: ["Balcony", "Washer"],
    availableAt: new Date("2026-12-01T00:00:00.000Z"),
    ...overrides,
  });

const count = ({
  filters = {},
  callerUserId,
  listedByUserIds,
  maximumBuildings = 20,
}) =>
  countMatchingBuildingsForOpportunity({
    opportunity: { geoSearch: { coverage }, filters },
    callerUserId,
    listedByUserIds,
    maximumBuildings,
  });

before(async () => {
  replSet = await MongoMemoryReplSet.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri("agent_demand_matching_focus_test"));

  const [agentModule, buildingModule, listingModule, userModule] =
    await Promise.all([
      import("../modules/agent/agent-profile.model.js"),
      import("../modules/building/building.model.js"),
      import("../modules/listing/listing.model.js"),
      import("../modules/user/user.model.js"),
    ]);
  AgentProfile = agentModule.default;
  Building = buildingModule.default;
  Listing = listingModule.default;
  User = userModule.default;
  await Building.syncIndexes();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

after(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe("agent demand matching focused scenarios", () => {
  test("applies active state, geometry, and every building filter", async () => {
    const caller = await createAgent();
    const building = await createBuilding(caller.user._id);
    await createListing(building._id, caller.user._id);

    const matchingFilters = {
      buildingType: BUILDING_TYPES.APARTMENT,
      buildingFacilities: ["Lift", "Pool"],
      security: ["CCTV", "Keycard"],
    };
    assert.equal(
      (await count({ filters: matchingFilters, callerUserId: caller.user._id }))
        .myMatchingBuildingCount,
      1,
    );

    for (const [update, filters] of [
      [{ isActive: false }, matchingFilters],
      [
        { location: { type: "Point", coordinates: [101.64, 14.765] } },
        matchingFilters,
      ],
      [{}, { ...matchingFilters, buildingType: BUILDING_TYPES.CONDO }],
      [{}, { ...matchingFilters, buildingFacilities: ["Lift", "Gym"] }],
      [{}, { ...matchingFilters, security: ["CCTV", "Guard"] }],
    ]) {
      if (Object.keys(update).length > 0) {
        await Building.updateOne({ _id: building._id }, { $set: update });
      }
      const result = await count({ filters, callerUserId: caller.user._id });
      assert.equal(result.myMatchingBuildingCount, 0);
      await Building.updateOne(
        { _id: building._id },
        {
          $set: {
            isActive: true,
            location: { type: "Point", coordinates: [100.64, 13.765] },
          },
        },
      );
    }
  });

  test("applies every scalar and array listing filter with correct direction", async () => {
    const caller = await createAgent();
    const building = await createBuilding(caller.user._id);
    await createListing(building._id, caller.user._id);

    const matching = {
      minRent: 15_000,
      maxRent: 25_000,
      contractMonths: 12,
      occupancy: 2,
      isForeignerAccepted: true,
      isTM30Provided: true,
      bedroomCount: 2,
      bathroomCount: 2,
      kitchenType: KITCHEN_TYPES.KITCHEN,
      isCookingAllowed: true,
      isPetAllowed: true,
      listingFacilities: ["Balcony", "Washer"],
      availableBy: new Date("2027-01-01T00:00:00.000Z"),
    };
    assert.equal(
      (await count({ filters: matching, callerUserId: caller.user._id }))
        .myMatchingBuildingCount,
      1,
    );

    const mismatches = [
      { ...matching, minRent: 21_000 },
      { ...matching, maxRent: 19_000 },
      { ...matching, contractMonths: 3 },
      { ...matching, occupancy: 4 },
      { ...matching, isForeignerAccepted: false },
      { ...matching, isTM30Provided: false },
      { ...matching, bedroomCount: 3 },
      { ...matching, bathroomCount: 3 },
      { ...matching, kitchenType: KITCHEN_TYPES.NO_KITCHEN },
      { ...matching, isCookingAllowed: false },
      { ...matching, isPetAllowed: false },
      { ...matching, listingFacilities: ["Balcony", "Dryer"] },
      { ...matching, availableBy: new Date("2026-11-30T00:00:00.000Z") },
    ];

    for (const filters of mismatches) {
      const result = await count({ filters, callerUserId: caller.user._id });
      assert.equal(result.myMatchingBuildingCount, 0);
    }
  });

  test("accepts flexible availability and kitchen compatibility semantics", async () => {
    const caller = await createAgent();
    const building = await createBuilding(caller.user._id);
    const listing = await createListing(building._id, caller.user._id, {
      availableAt: null,
      kitchenType: KITCHEN_TYPES.SEPARATE_KITCHEN,
    });

    const result = await count({
      filters: {
        availableBy: new Date("2026-01-01T00:00:00.000Z"),
        kitchenType: KITCHEN_TYPES.KITCHEN,
      },
      callerUserId: caller.user._id,
    });
    assert.equal(result.myMatchingBuildingCount, 1);

    await Listing.updateOne({ _id: listing._id }, { $set: { bedroomCount: 1 } });
    assert.equal(
      (await count({ filters: { bedroomCount: 0 }, callerUserId: caller.user._id }))
        .myMatchingBuildingCount,
      0,
    );
  });

  test("excludes private, deleted, and non-matching listings", async () => {
    const caller = await createAgent();
    const building = await createBuilding(caller.user._id);

    for (const overrides of [
      { visibility: LISTING_VISIBILITIES.PRIVATE },
      { isDeleted: true },
      { rent: 50_000 },
    ]) {
      const listing = await createListing(building._id, caller.user._id, overrides);
      const result = await count({
        filters: { maxRent: 30_000 },
        callerUserId: caller.user._id,
      });
      assert.equal(result.myMatchingBuildingCount, 0);
      await Listing.deleteOne({ _id: listing._id });
    }
  });

  test("requires an eligible agent and applies language and profile restrictions", async () => {
    const caller = await createAgent();
    const platform = await createAgent({ supportLanguages: ["Thai"] });
    const building = await createBuilding(caller.user._id);
    await createListing(building._id, platform.user._id);

    assert.equal(
      (await count({
        filters: { supportLanguages: ["English"] },
        callerUserId: caller.user._id,
      })).platformMatchingBuildingCount,
      0,
    );
    assert.equal(
      (await count({
        filters: { supportLanguages: ["Thai"] },
        callerUserId: caller.user._id,
        listedByUserIds: [platform.user._id],
      })).platformMatchingBuildingCount,
      1,
    );
    assert.equal(
      (await count({
        callerUserId: caller.user._id,
        listedByUserIds: [],
      })).platformMatchingBuildingCount,
      0,
    );

    await User.updateOne(
      { _id: platform.user._id },
      { $set: { status: USER_STATUSES.INACTIVE } },
    );
    assert.equal(
      (await count({ callerUserId: caller.user._id }))
        .platformMatchingBuildingCount,
      0,
    );
    await User.updateOne(
      { _id: platform.user._id },
      { $set: { status: USER_STATUSES.ACTIVE } },
    );
    await AgentProfile.updateOne(
      { _id: platform.profile._id },
      { $set: { isDeleted: true } },
    );
    assert.equal(
      (await count({ callerUserId: caller.user._id }))
        .platformMatchingBuildingCount,
      0,
    );
  });

  test("counts a building once and gives the caller ownership priority", async () => {
    const caller = await createAgent();
    const platform = await createAgent();
    const building = await createBuilding(caller.user._id);
    await createListing(building._id, platform.user._id);
    await createListing(building._id, platform.user._id);
    await createListing(building._id, caller.user._id);

    const result = await count({ callerUserId: caller.user._id });
    assert.deepEqual(result, {
      myMatchingBuildingCount: 1,
      platformMatchingBuildingCount: 0,
      matchingBuildingCountCapped: false,
    });
  });

  test("uses the building 2dsphere index for the geo-first stage", async () => {
    const caller = await createAgent();
    const building = await createBuilding(caller.user._id);
    await createListing(building._id, caller.user._id);
    const pipeline = buildMatchingBuildingClassificationsPipeline({
      coverage,
      filters: {},
      callerUserId: caller.user._id,
      listedByUserIds: undefined,
      maximumBuildings: 20,
    });
    const explanation = await Building.collection
      .aggregate(pipeline)
      .explain("executionStats");

    assert.match(JSON.stringify(explanation), /GEO|2dsphere/i);
    const cursor = explanation.stages?.find((stage) => stage.$cursor)?.$cursor;
    assert.ok(cursor?.executionStats.totalDocsExamined <= 1);
    const listingLookup = explanation.stages?.find(
      (stage) => stage.$lookup?.from === "listings",
    );
    assert.ok(listingLookup?.indexesUsed?.length > 0);
    assert.equal(listingLookup.collectionScans, 0);
  });
});
