import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_DEDUPE_PREFIX,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildFollowerDedupeKey } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import { DEDUPE_KEY_MAX_LENGTH } from "../modules/notification/notification-delivery.constants.js";

const buildingId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const listingA = new mongoose.Types.ObjectId();
const listingB = new mongoose.Types.ObjectId();

const buildPriceDropKey = (overrides = {}) =>
  buildFollowerDedupeKey({
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
    buildingId,
    userId,
    newMinRent: 4500,
    ...overrides,
  });

const buildNewListingKey = (overrides = {}) =>
  buildFollowerDedupeKey({
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    buildingId,
    userId,
    listings: [{ listingId: listingA }],
    ...overrides,
  });

const buildAvailableAgainKey = (overrides = {}) =>
  buildFollowerDedupeKey({
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
    buildingId,
    userId,
    listings: [{ listingId: listingA }],
    ...overrides,
  });

describe("buildFollowerDedupeKey", () => {
  describe("rejects unsupported change types", () => {
    test("throws for an unknown change type", () => {
      assert.throws(
        () =>
          buildFollowerDedupeKey({
            changeType: "UNKNOWN",
            buildingId,
            userId,
          }),
        /Unsupported follower change type: UNKNOWN/,
      );
    });

    test("throws when changeType is missing", () => {
      assert.throws(
        () =>
          buildFollowerDedupeKey({
            buildingId,
            userId,
          }),
        /Unsupported follower change type: undefined/,
      );
    });
  });

  describe("builds price-drop dedupe keys", () => {
    test("uses the followed-building rent-drop prefix and newMinRent suffix", () => {
      const key = buildPriceDropKey({ newMinRent: 4500 });

      assert.equal(
        key,
        `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.rent-drop.${buildingId.toString()}.${userId.toString()}.4500`,
      );
    });

    test("scopes dedupe separately for different newMinRent values", () => {
      const first = buildPriceDropKey({ newMinRent: 4500 });
      const second = buildPriceDropKey({ newMinRent: 4000 });

      assert.notEqual(first, second);
      assert.match(first, /\.4500$/);
      assert.match(second, /\.4000$/);
    });

    test("accepts zero and fractional newMinRent values", () => {
      const zeroKey = buildPriceDropKey({ newMinRent: 0 });
      const fractionalKey = buildPriceDropKey({ newMinRent: 4499.5 });

      assert.match(zeroKey, /\.0$/);
      assert.match(fractionalKey, /\.4499\.5$/);
    });

    test('uses "unknown" when newMinRent is missing or invalid', () => {
      for (const newMinRent of [null, undefined, "4500", NaN, Infinity]) {
        const key = buildPriceDropKey({ newMinRent });

        assert.match(
          key,
          /\.unknown$/,
          `expected unknown rent suffix for ${String(newMinRent)}`,
        );
      }
    });

    test("accepts ObjectId and string ids interchangeably", () => {
      const withObjectIds = buildPriceDropKey({
        buildingId,
        userId,
        newMinRent: 4500,
      });
      const withStrings = buildPriceDropKey({
        buildingId: buildingId.toString(),
        userId: userId.toString(),
        newMinRent: 4500,
      });

      assert.equal(withObjectIds, withStrings);
    });
  });

  describe("builds listing-batch dedupe keys", () => {
    test("scopes new-listing dedupe by listing id", () => {
      const first = buildNewListingKey({
        listings: [{ listingId: listingA }],
      });
      const second = buildNewListingKey({
        listings: [{ listingId: listingB }],
      });

      assert.notEqual(first, second);
      assert.equal(
        first,
        `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.new-listing.${buildingId.toString()}.${userId.toString()}.${listingA.toString()}`,
      );
      assert.match(second, new RegExp(`\\.${listingB.toString()}$`));
    });

    test("scopes available-again dedupe separately from new-listing for the same batch", () => {
      const listings = [{ listingId: listingA }, { listingId: listingB }];
      const newListingKey = buildNewListingKey({ listings });
      const availableAgainKey = buildAvailableAgainKey({ listings });

      assert.notEqual(newListingKey, availableAgainKey);
      assert.match(newListingKey, /\.new-listing\./);
      assert.match(availableAgainKey, /\.available-again\./);
    });

    test("sorts listing ids deterministically regardless of input order", () => {
      const first = buildNewListingKey({
        listings: [{ listingId: listingA }, { listingId: listingB }],
      });
      const second = buildNewListingKey({
        listings: [{ listingId: listingB }, { listingId: listingA }],
      });

      assert.equal(first, second);
      assert.match(first, new RegExp(`\\.${listingA.toString()}\\.${listingB.toString()}$`));
    });

    test('uses "empty" when no listing ids are provided', () => {
      const key = buildNewListingKey({ listings: [] });

      assert.match(key, /\.empty$/);
    });

    test("ignores listing entries without a listingId", () => {
      const key = buildNewListingKey({
        listings: [{ listingId: null }, { listingId: undefined }, {}],
      });

      assert.match(key, /\.empty$/);
    });

    test("accepts listingId as either ObjectId or string", () => {
      const withObjectId = buildNewListingKey({
        listings: [{ listingId: listingA }],
      });
      const withString = buildNewListingKey({
        listings: [{ listingId: listingA.toString() }],
      });

      assert.equal(withObjectId, withString);
    });

    test("uses a compact hash suffix for large listing batches", () => {
      const listings = Array.from({ length: 20 }, () => ({
        listingId: new mongoose.Types.ObjectId(),
      }));

      const key = buildAvailableAgainKey({ listings });

      assert.match(key, /\.h[a-z0-9]+$/);
      assert.ok(key.length <= DEDUPE_KEY_MAX_LENGTH);
    });

    test("uses joined listing ids when the batch suffix is short enough", () => {
      const key = buildNewListingKey({
        listings: [{ listingId: listingA }, { listingId: listingB }],
      });

      assert.match(key, new RegExp(`\\.${listingA.toString()}\\.${listingB.toString()}$`));
      assert.doesNotMatch(key, /\.h[a-z0-9]+$/);
    });
  });

  describe("keeps keys within delivery limits", () => {
    test("stays within DEDUPE_KEY_MAX_LENGTH for every supported change type", () => {
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

        assert.ok(
          key.length <= DEDUPE_KEY_MAX_LENGTH,
          `${changeType} key length ${key.length} exceeds max`,
        );
        assert.match(key, new RegExp(`^${BUILDING_FOLLOWERS_DEDUPE_PREFIX}\\.`));
      }
    });
  });

  describe("is pure and safe for production callers", () => {
    test("does not mutate the listings array or its entries", () => {
      const listings = [
        { listingId: listingB, rent: 5200 },
        { listingId: listingA, rent: 5000 },
      ];
      const snapshot = structuredClone({
        order: listings.map((entry) => ({
          listingId: entry.listingId.toString(),
          rent: entry.rent,
        })),
      });

      buildNewListingKey({ listings });

      assert.deepEqual(
        listings.map((entry) => ({
          listingId: entry.listingId.toString(),
          rent: entry.rent,
        })),
        snapshot.order,
      );
    });

    test("returns the same key for identical input", () => {
      const input = {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
        userId,
        listings: [{ listingId: listingA }, { listingId: listingB }],
      };

      assert.equal(
        buildFollowerDedupeKey(input),
        buildFollowerDedupeKey(input),
      );
    });
  });
});
