import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { shouldExcludeFollower } from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";

const userObjectId = new mongoose.Types.ObjectId();
const userId = userObjectId.toString();
const otherUserId = new mongoose.Types.ObjectId().toString();

describe("shouldExcludeFollower", () => {
  describe("treats missing follower ids as excluded", () => {
    test("returns true when followerUserId is null", () => {
      assert.equal(shouldExcludeFollower(null, { excludeUserIds: [userId] }), true);
    });

    test("returns true when followerUserId is undefined", () => {
      assert.equal(shouldExcludeFollower(undefined, { excludeUserIds: [userId] }), true);
    });

    test("returns true when followerUserId is an empty string", () => {
      assert.equal(shouldExcludeFollower("", { excludeUserIds: [userId] }), true);
    });
  });

  describe("matches excludeUserIds", () => {
    test("returns true when the follower id is listed", () => {
      assert.equal(
        shouldExcludeFollower(userId, { excludeUserIds: [otherUserId, userId] }),
        true,
      );
    });

    test("returns false when the follower id is not listed", () => {
      assert.equal(
        shouldExcludeFollower(userId, { excludeUserIds: [otherUserId] }),
        false,
      );
    });

    test("normalizes ObjectId follower ids before matching", () => {
      assert.equal(
        shouldExcludeFollower(userObjectId, { excludeUserIds: [userId] }),
        true,
      );
    });

    test("returns false when excludeUserIds is empty", () => {
      assert.equal(shouldExcludeFollower(userId, { excludeUserIds: [] }), false);
    });

    test("returns false when excludeUserIds is missing", () => {
      assert.equal(shouldExcludeFollower(userId), false);
      assert.equal(shouldExcludeFollower(userId, {}), false);
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves excludeUserIds unchanged", () => {
      const options = { excludeUserIds: [otherUserId] };
      const snapshot = structuredClone(options);

      shouldExcludeFollower(userId, options);

      assert.deepEqual(options, snapshot);
    });
  });
});
