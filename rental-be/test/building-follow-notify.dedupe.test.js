import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildFollowerDedupeKey } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import { DEDUPE_KEY_MAX_LENGTH } from "../modules/notification/notification-delivery.constants.js";

describe("buildFollowerDedupeKey", () => {
  const buildingId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const listingA = new mongoose.Types.ObjectId();
  const listingB = new mongoose.Types.ObjectId();

  test("scopes price-drop dedupe by newMinRent", () => {
    const first = buildFollowerDedupeKey({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
      buildingId,
      userId,
      newMinRent: 4500,
    });
    const second = buildFollowerDedupeKey({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
      buildingId,
      userId,
      newMinRent: 4000,
    });

    assert.notEqual(first, second);
    assert.match(first, /\.4500$/);
    assert.match(second, /\.4000$/);
  });

  test("scopes listing batch dedupe by listing ids", () => {
    const first = buildFollowerDedupeKey({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      userId,
      listings: [{ listingId: listingA }],
    });
    const second = buildFollowerDedupeKey({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      userId,
      listings: [{ listingId: listingB }],
    });

    assert.notEqual(first, second);
    assert.match(first, new RegExp(`\\.${listingA.toString()}$`));
    assert.match(second, new RegExp(`\\.${listingB.toString()}$`));
  });

  test("uses a compact hash suffix for large listing batches", () => {
    const listings = Array.from({ length: 20 }, () => ({
      listingId: new mongoose.Types.ObjectId(),
    }));

    const key = buildFollowerDedupeKey({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
      buildingId,
      userId,
      listings,
    });

    assert.match(key, /\.h[a-z0-9]+$/);
    assert.ok(key.length <= DEDUPE_KEY_MAX_LENGTH);
  });

  test("keeps dedupe keys within delivery limits", () => {
    const listings = Array.from({ length: 3 }, () => ({
      listingId: new mongoose.Types.ObjectId(),
    }));

    for (const changeType of Object.values(BUILDING_FOLLOWER_CHANGE_TYPES)) {
      const key = buildFollowerDedupeKey({
        changeType,
        buildingId,
        userId,
        newMinRent: 5000,
        listings,
      });

      assert.ok(key.length <= DEDUPE_KEY_MAX_LENGTH, `${changeType}: ${key.length}`);
      assert.match(key, /^followed-building\./);
    }
  });
});
