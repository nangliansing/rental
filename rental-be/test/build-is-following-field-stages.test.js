import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { buildIsFollowingFieldStages } from "../modules/building-follow/pipelines/build-is-following-field-stages.js";

describe("buildIsFollowingFieldStages", () => {
  test("returns a constant false field when viewer is absent", () => {
    const stages = buildIsFollowingFieldStages(null);

    assert.equal(stages.length, 1);
    assert.deepEqual(stages[0], {
      $addFields: {
        isFollowing: false,
      },
    });
  });

  test("returns lookup stages scoped to the viewer and building id", () => {
    const viewerUserId = new mongoose.Types.ObjectId();
    const stages = buildIsFollowingFieldStages(viewerUserId);

    assert.equal(stages.length, 3);
    assert.equal(stages[0].$lookup.from, "building_follows");
    assert.equal(stages[0].$lookup.let.buildingId, "$_id");
    assert.deepEqual(stages[0].$lookup.pipeline[0].$match.$expr.$and, [
      { $eq: ["$buildingId", "$$buildingId"] },
      { $eq: ["$userId", viewerUserId] },
    ]);
    assert.equal(stages[0].$lookup.pipeline[1].$limit, 1);
    assert.deepEqual(stages[1], {
      $addFields: {
        isFollowing: { $gt: [{ $size: "$_followedByMe" }, 0] },
      },
    });
    assert.deepEqual(stages[2], {
      $project: {
        _followedByMe: 0,
      },
    });
  });
});
