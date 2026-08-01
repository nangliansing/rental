import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { normalizeBuildingFollowersNotifyJobData } from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";

const buildingObjectId = new mongoose.Types.ObjectId();
const buildingId = buildingObjectId.toString();
const listingObjectId = new mongoose.Types.ObjectId();
const listingId = listingObjectId.toString();
const excludeObjectId = new mongoose.Types.ObjectId();
const excludeUserId = excludeObjectId.toString();

const basePayload = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId,
  occurredAt: "2026-08-01T10:00:00.000Z",
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

describe("normalizeBuildingFollowersNotifyJobData", () => {
  describe("rejects invalid input", () => {
    test("returns null for null", () => {
      assert.equal(normalizeBuildingFollowersNotifyJobData(null), null);
    });

    test("returns null for undefined", () => {
      assert.equal(normalizeBuildingFollowersNotifyJobData(undefined), null);
    });

    test("returns null for non-object values", () => {
      assert.equal(normalizeBuildingFollowersNotifyJobData("payload"), null);
      assert.equal(normalizeBuildingFollowersNotifyJobData(42), null);
    });
  });

  describe("normalizes top-level fields", () => {
    test("preserves changeType and converts buildingId to string", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ buildingId: buildingObjectId }),
      );

      assert.equal(normalized.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
      assert.equal(normalized.buildingId, buildingId);
    });

    test("normalizes occurredAt from ISO strings", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ occurredAt: "2026-08-01T10:00:00.000Z" }),
      );

      assert.equal(normalized.occurredAt, "2026-08-01T10:00:00.000Z");
    });

    test("normalizes occurredAt from Date objects", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ occurredAt: new Date("2026-08-01T10:00:00.000Z") }),
      );

      assert.equal(normalized.occurredAt, "2026-08-01T10:00:00.000Z");
    });

    test("uses current time when occurredAt is missing or invalid", () => {
      const before = Date.now();

      const missing = normalizeBuildingFollowersNotifyJobData(
        basePayload({ occurredAt: undefined }),
      );
      const invalid = normalizeBuildingFollowersNotifyJobData(
        basePayload({ occurredAt: "not-a-date" }),
      );

      const after = Date.now();

      for (const normalized of [missing, invalid]) {
        const occurredAtMs = Date.parse(normalized.occurredAt);
        assert.ok(occurredAtMs >= before);
        assert.ok(occurredAtMs <= after);
      }
    });

    test("extracts metadata fields with null fallbacks", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          metadata: {
            buildingName: "Sky Residence",
            oldMinRent: 7000,
            newMinRent: 6500,
          },
        }),
      );

      assert.deepEqual(normalized.metadata, {
        buildingName: "Sky Residence",
        oldMinRent: 7000,
        newMinRent: 6500,
      });

      assert.deepEqual(
        normalizeBuildingFollowersNotifyJobData(basePayload({ metadata: undefined }))
          .metadata,
        {
          buildingName: null,
          oldMinRent: null,
          newMinRent: null,
        },
      );
    });
  });

  describe("normalizes excludeUserIds", () => {
    test("collects a single excludeUserId", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ excludeUserId: excludeObjectId }),
      );

      assert.deepEqual(normalized.excludeUserIds, [excludeUserId]);
    });

    test("collects excludeUserIds arrays and deduplicates values", () => {
      const otherExcludeId = new mongoose.Types.ObjectId().toString();

      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          excludeUserId: excludeUserId,
          excludeUserIds: [excludeUserId, otherExcludeId, null, undefined],
        }),
      );

      assert.deepEqual(normalized.excludeUserIds.sort(), [excludeUserId, otherExcludeId].sort());
    });

    test("adds listing-level excludeUserId values", () => {
      const listingExcludeId = new mongoose.Types.ObjectId().toString();

      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          listings: [
            {
              listingId,
              excludeUserId: listingExcludeId,
              occurredAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        }),
      );

      assert.deepEqual(normalized.excludeUserIds, [listingExcludeId]);
    });
  });

  describe("normalizes listings arrays", () => {
    test("normalizes listing entries and skips invalid ids", () => {
      const validListingId = new mongoose.Types.ObjectId().toString();

      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          listings: [
            {
              listingId: validListingId,
              rent: 5500,
              availableAt: "2026-08-02T00:00:00.000Z",
              occurredAt: "2026-08-01T10:05:00.000Z",
              excludeUserId,
              becamePublic: true,
              availabilityChanged: true,
            },
            { listingId: null },
            { listingId: undefined },
            {},
          ],
        }),
      );

      assert.equal(normalized.listings.length, 1);
      assert.deepEqual(normalized.listings[0], {
        listingId: validListingId,
        rent: 5500,
        availableAt: "2026-08-02T00:00:00.000Z",
        occurredAt: "2026-08-01T10:05:00.000Z",
        excludeUserId,
        becamePublic: true,
        availabilityChanged: true,
      });
    });

    test("falls back listing occurredAt to the job occurredAt", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          occurredAt: "2026-08-01T10:00:00.000Z",
          listings: [{ listingId, rent: 5500 }],
        }),
      );

      assert.equal(normalized.listings[0].occurredAt, "2026-08-01T10:00:00.000Z");
    });

    test("defaults optional listing fields to null or false", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          listings: [
            {
              listingId,
              becamePublic: "yes",
              availabilityChanged: 1,
            },
          ],
        }),
      );

      assert.deepEqual(normalized.listings[0], {
        listingId,
        rent: null,
        availableAt: null,
        occurredAt: "2026-08-01T10:00:00.000Z",
        excludeUserId: null,
        becamePublic: false,
        availabilityChanged: false,
      });
    });

    test("returns an empty listings array when listings is not an array", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ listings: "not-an-array" }),
      );

      assert.deepEqual(normalized.listings, []);
    });
  });

  describe("supports legacy single-listing payloads", () => {
    test("builds a listing from root listingId and metadata when listings are absent", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData({
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
        listingId,
        occurredAt: "2026-08-01T10:00:00.000Z",
        excludeUserId,
        metadata: {
          buildingName: "Sky Residence",
          rent: 5500,
          availableAt: "2026-08-02T00:00:00.000Z",
          becamePublic: true,
          availabilityChanged: true,
        },
      });

      assert.equal(normalized.listings.length, 1);
      assert.deepEqual(normalized.listings[0], {
        listingId,
        rent: 5500,
        availableAt: "2026-08-02T00:00:00.000Z",
        occurredAt: "2026-08-01T10:00:00.000Z",
        excludeUserId,
        becamePublic: true,
        availabilityChanged: true,
      });
      assert.deepEqual(normalized.excludeUserIds, [excludeUserId]);
    });

    test("prefers listings array over legacy root listingId", () => {
      const arrayListingId = new mongoose.Types.ObjectId().toString();

      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({
          listingId,
          listings: [
            {
              listingId: arrayListingId,
              rent: 5200,
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      assert.equal(normalized.listings.length, 1);
      assert.equal(normalized.listings[0].listingId, arrayListingId);
    });

    test("leaves listings empty when neither array nor legacy listingId is present", () => {
      const normalized = normalizeBuildingFollowersNotifyJobData(
        basePayload({ listings: [] }),
      );

      assert.deepEqual(normalized.listings, []);
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves the raw payload unchanged", () => {
      const raw = basePayload({
        excludeUserIds: [excludeUserId],
        listings: [
          {
            listingId,
            rent: 5500,
            occurredAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      });
      const snapshot = structuredClone(raw);

      normalizeBuildingFollowersNotifyJobData(raw);

      assert.deepEqual(raw, snapshot);
    });
  });
});
