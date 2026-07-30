import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import {
  enrichListingWithBuildingFollowState,
  enrichListingsWithBuildingFollowState,
} from "../modules/building-follow/utils/enrich-listing-building-with-viewer-state.js";
import Building from "../modules/building/building.model.js";
import User from "../modules/user/user.model.js";

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(
    mongoServer.getUri("enrich_listing_building_follow_test"),
  );
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("enrichListingWithBuildingFollowState", () => {
  test("returns nullish and non-object listing input unchanged", async () => {
    assert.equal(await enrichListingWithBuildingFollowState({ listing: null }), null);
    assert.equal(
      await enrichListingWithBuildingFollowState({ listing: undefined }),
      undefined,
    );
    assert.equal(
      await enrichListingWithBuildingFollowState({ listing: "listing" }),
      "listing",
    );
  });

  test("returns listing unchanged when building is null or missing", async () => {
    const withoutBuilding = { _id: new mongoose.Types.ObjectId(), rent: 12000 };
    const withNullBuilding = {
      _id: new mongoose.Types.ObjectId(),
      rent: 12000,
      building: null,
    };

    assert.equal(
      await enrichListingWithBuildingFollowState({ listing: withoutBuilding }),
      withoutBuilding,
    );
    assert.equal(
      await enrichListingWithBuildingFollowState({ listing: withNullBuilding }),
      withNullBuilding,
    );
  });

  test("does not mutate the original listing object", async () => {
    const building = await Building.create({
      name: "Immutable Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Immutable Viewer",
      email: "immutable-viewer@example.com",
    });
    const listing = {
      _id: new mongoose.Types.ObjectId(),
      rent: 14000,
      building: building.toObject(),
    };
    const originalBuilding = listing.building;

    await enrichListingWithBuildingFollowState({
      listing,
      viewerUserId: user._id,
    });

    assert.equal(listing.building, originalBuilding);
    assert.equal(Object.hasOwn(listing.building, "isFollowing"), false);
  });

  test("merges isFollowing onto nested building for a follower", async () => {
    const building = await Building.create({
      name: "Nested Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Nested Viewer",
      email: "nested-viewer@example.com",
    });

    await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    const listing = {
      _id: new mongoose.Types.ObjectId(),
      rent: 14000,
      building: building.toObject(),
    };

    const enriched = await enrichListingWithBuildingFollowState({
      listing,
      viewerUserId: user._id,
    });

    assert.equal(enriched._id.toString(), listing._id.toString());
    assert.equal(enriched.building._id.toString(), building._id.toString());
    assert.equal(enriched.building.isFollowing, true);
    assert.equal(Object.hasOwn(listing.building, "isFollowing"), false);
  });

  test("returns isFollowing false for anonymous viewers", async () => {
    const building = await Building.create({
      name: "Anonymous Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Anonymous Follower",
      email: "anonymous-follower@example.com",
    });

    await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    const enriched = await enrichListingWithBuildingFollowState({
      listing: {
        _id: new mongoose.Types.ObjectId(),
        building: building.toObject(),
      },
      viewerUserId: null,
    });

    assert.equal(enriched.building.isFollowing, false);
  });
});

describe("enrichListingsWithBuildingFollowState", () => {
  test("returns non-array input unchanged", async () => {
    assert.equal(
      await enrichListingsWithBuildingFollowState({ listings: null }),
      null,
    );
    assert.equal(
      await enrichListingsWithBuildingFollowState({ listings: undefined }),
      undefined,
    );
  });

  test("enriches every listing in an array", async () => {
    const building = await Building.create({
      name: "Batch Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Batch Viewer",
      email: "batch-viewer@example.com",
    });

    await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    const listings = [
      {
        _id: new mongoose.Types.ObjectId(),
        building: building.toObject(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        building: null,
      },
    ];

    const enriched = await enrichListingsWithBuildingFollowState({
      listings,
      viewerUserId: user._id,
    });

    assert.equal(enriched.length, 2);
    assert.equal(enriched[0].building.isFollowing, true);
    assert.equal(enriched[1].building, null);
  });
});
