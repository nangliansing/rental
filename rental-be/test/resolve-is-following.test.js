import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import BuildingFollow from "../modules/building-follow/building-follow.model.js";
import {
  attachIsFollowingToBuilding,
  resolveIsFollowing,
} from "../modules/building-follow/utils/resolve-is-following.js";
import Building from "../modules/building/building.model.js";
import User from "../modules/user/user.model.js";

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("resolve_is_following_test"));
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("resolveIsFollowing", () => {
  test("returns false when viewer or building id is missing", async () => {
    const building = await Building.create({
      name: "Unit Test Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Unit Viewer",
      email: "viewer@example.com",
    });

    assert.equal(await resolveIsFollowing({ viewerUserId: null, buildingId: building._id }), false);
    assert.equal(await resolveIsFollowing({ viewerUserId: user._id, buildingId: null }), false);
    assert.equal(await resolveIsFollowing({ viewerUserId: null, buildingId: null }), false);
  });

  test("returns false when the viewer has not followed the building", async () => {
    const building = await Building.create({
      name: "Unit Test Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Unit Viewer",
      email: "viewer@example.com",
    });

    assert.equal(
      await resolveIsFollowing({
        viewerUserId: user._id,
        buildingId: building._id,
      }),
      false,
    );
  });

  test("returns true when a follow record exists", async () => {
    const building = await Building.create({
      name: "Unit Test Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Unit Viewer",
      email: "viewer@example.com",
    });

    await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    assert.equal(
      await resolveIsFollowing({
        viewerUserId: user._id.toString(),
        buildingId: building._id.toString(),
      }),
      true,
    );
  });

  test("returns false after the follow record is removed", async () => {
    const building = await Building.create({
      name: "Unit Test Building",
      location: { type: "Point", coordinates: [100.501, 13.75] },
      createdBy: new mongoose.Types.ObjectId(),
    });
    const user = await User.create({
      name: "Unit Viewer",
      email: "viewer@example.com",
    });

    const follow = await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    assert.equal(
      await resolveIsFollowing({
        viewerUserId: user._id,
        buildingId: building._id,
      }),
      true,
    );

    await BuildingFollow.deleteOne({ _id: follow._id });

    assert.equal(
      await resolveIsFollowing({
        viewerUserId: user._id,
        buildingId: building._id,
      }),
      false,
    );
  });
});

describe("attachIsFollowingToBuilding", () => {
  test("returns nullish building input unchanged", async () => {
    assert.equal(await attachIsFollowingToBuilding({ building: null }), null);
    assert.equal(await attachIsFollowingToBuilding({ building: undefined }), undefined);
  });

  test("merges isFollowing onto the building object", async () => {
    const building = {
      _id: new mongoose.Types.ObjectId(),
      name: "Plain object building",
    };
    const user = await User.create({
      name: "Unit Viewer",
      email: "viewer-merge@example.com",
    });

    await BuildingFollow.create({
      userId: user._id,
      buildingId: building._id,
    });

    const enriched = await attachIsFollowingToBuilding({
      building,
      viewerUserId: user._id,
    });

    assert.equal(enriched.name, "Plain object building");
    assert.equal(enriched.isFollowing, true);
  });
});
