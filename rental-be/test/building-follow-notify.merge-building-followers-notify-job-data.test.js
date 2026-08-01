import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import {
  mergeBuildingFollowersNotifyJobData,
  normalizeBuildingFollowersNotifyJobData,
} from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";

const buildingId = new mongoose.Types.ObjectId().toString();

const newListingPayload = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId,
  occurredAt: "2026-08-01T10:00:00.000Z",
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

const availableAgainPayload = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
  buildingId,
  occurredAt: "2026-08-01T10:00:00.000Z",
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

const priceDropPayload = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
  buildingId,
  occurredAt: "2026-08-01T10:00:00.000Z",
  metadata: {
    buildingName: "Sky Residence",
    oldMinRent: 7000,
    newMinRent: 6500,
  },
  ...overrides,
});

describe("mergeBuildingFollowersNotifyJobData", () => {
  describe("handles invalid or one-sided input", () => {
    test("returns existing when incoming is null", () => {
      const existing = normalizeBuildingFollowersNotifyJobData(newListingPayload());

      assert.deepEqual(mergeBuildingFollowersNotifyJobData(existing, null), existing);
    });

    test("returns existing when incoming is undefined", () => {
      const existing = normalizeBuildingFollowersNotifyJobData(newListingPayload());

      assert.deepEqual(
        mergeBuildingFollowersNotifyJobData(existing, undefined),
        existing,
      );
    });

    test("returns incoming when existing is null", () => {
      const incoming = normalizeBuildingFollowersNotifyJobData(newListingPayload());

      assert.deepEqual(mergeBuildingFollowersNotifyJobData(null, incoming), incoming);
    });

    test("returns null when both payloads are invalid", () => {
      assert.equal(mergeBuildingFollowersNotifyJobData(null, null), null);
      assert.equal(mergeBuildingFollowersNotifyJobData(undefined, undefined), null);
    });
  });

  describe("rejects mismatched payloads", () => {
    test("returns incoming when changeType differs", () => {
      const existing = normalizeBuildingFollowersNotifyJobData(newListingPayload());
      const incoming = normalizeBuildingFollowersNotifyJobData(
        priceDropPayload({ occurredAt: "2026-08-01T10:05:00.000Z" }),
      );

      assert.deepEqual(mergeBuildingFollowersNotifyJobData(existing, incoming), incoming);
    });

    test("returns incoming when buildingId differs", () => {
      const otherBuildingId = new mongoose.Types.ObjectId().toString();
      const existing = normalizeBuildingFollowersNotifyJobData(newListingPayload());
      const incoming = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          buildingId: otherBuildingId,
          occurredAt: "2026-08-01T10:05:00.000Z",
        }),
      );

      assert.deepEqual(mergeBuildingFollowersNotifyJobData(existing, incoming), incoming);
    });

    test("returns incoming for unsupported change types", () => {
      const existing = normalizeBuildingFollowersNotifyJobData(newListingPayload());
      const incoming = normalizeBuildingFollowersNotifyJobData({
        changeType: "LEGACY_NOTIFY",
        buildingId,
        occurredAt: "2026-08-01T10:05:00.000Z",
      });

      assert.deepEqual(mergeBuildingFollowersNotifyJobData(existing, incoming), incoming);
    });
  });

  describe("merges new listing payloads", () => {
    test("combines listings from both payloads", () => {
      const listingA = new mongoose.Types.ObjectId().toString();
      const listingB = new mongoose.Types.ObjectId().toString();
      const listingC = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          listings: [
            {
              listingId: listingA,
              rent: 5000,
              occurredAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        }),
      );

      const incoming = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          occurredAt: "2026-08-01T10:05:00.000Z",
          listings: [
            {
              listingId: listingB,
              rent: 5200,
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
            {
              listingId: listingC,
              rent: 5400,
              occurredAt: "2026-08-01T10:07:00.000Z",
            },
          ],
        }),
      );

      const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

      assert.equal(merged.listings.length, 3);
      assert.equal(merged.occurredAt, "2026-08-01T10:07:00.000Z");
      assert.deepEqual(
        merged.listings.map((listing) => listing.listingId).sort(),
        [listingA, listingB, listingC].sort(),
      );
    });

    test("deduplicates listing ids and keeps the latest listing fields", () => {
      const listingId = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          listings: [
            {
              listingId,
              rent: 5000,
              becamePublic: false,
              occurredAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        }),
      );

      const incoming = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          occurredAt: "2026-08-01T10:03:00.000Z",
          listings: [
            {
              listingId,
              rent: 4800,
              becamePublic: true,
              occurredAt: "2026-08-01T10:03:00.000Z",
            },
          ],
        }),
      );

      const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

      assert.equal(merged.listings.length, 1);
      assert.equal(merged.listings[0].rent, 4800);
      assert.equal(merged.listings[0].becamePublic, true);
      assert.equal(merged.listings[0].occurredAt, "2026-08-01T10:03:00.000Z");
    });

    test("keeps the later occurredAt when duplicate listings arrive out of order", () => {
      const listingId = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          listings: [
            {
              listingId,
              rent: 5000,
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      const incoming = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          listings: [
            {
              listingId,
              rent: 4800,
              occurredAt: "2026-08-01T10:03:00.000Z",
            },
          ],
        }),
      );

      const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

      assert.equal(merged.listings.length, 1);
      assert.equal(merged.listings[0].rent, 4800);
      assert.equal(merged.listings[0].occurredAt, "2026-08-01T10:05:00.000Z");
    });

    test("merges excludeUserIds from payloads and listing entries", () => {
      const listingId = new mongoose.Types.ObjectId().toString();
      const excludeA = new mongoose.Types.ObjectId().toString();
      const excludeB = new mongoose.Types.ObjectId().toString();
      const excludeC = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          excludeUserIds: [excludeA],
          listings: [
            {
              listingId,
              rent: 5000,
              excludeUserId: excludeB,
              occurredAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        }),
      );

      const incoming = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          excludeUserIds: [excludeC],
          listings: [
            {
              listingId: new mongoose.Types.ObjectId().toString(),
              rent: 5200,
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

      assert.deepEqual(merged.excludeUserIds.sort(), [excludeA, excludeB, excludeC].sort());
    });

    test("prefers incoming buildingName and falls back to existing", () => {
      const listingId = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          metadata: { buildingName: "Existing Tower" },
          listings: [{ listingId, occurredAt: "2026-08-01T10:00:00.000Z" }],
        }),
      );

      const incomingWithName = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          metadata: { buildingName: "Incoming Tower" },
          listings: [
            {
              listingId: new mongoose.Types.ObjectId().toString(),
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      const incomingWithoutName = normalizeBuildingFollowersNotifyJobData(
        newListingPayload({
          metadata: { buildingName: null },
          listings: [
            {
              listingId: new mongoose.Types.ObjectId().toString(),
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      assert.equal(
        mergeBuildingFollowersNotifyJobData(existing, incomingWithName).metadata.buildingName,
        "Incoming Tower",
      );
      assert.equal(
        mergeBuildingFollowersNotifyJobData(existing, incomingWithoutName).metadata
          .buildingName,
        "Existing Tower",
      );
    });

    test(`caps merged listings at ${BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB}`, () => {
      const existingListings = Array.from({ length: 60 }, (_, index) => ({
        listingId: new mongoose.Types.ObjectId().toString(),
        occurredAt: `2026-08-01T10:${String(index).padStart(2, "0")}:00.000Z`,
      }));

      const incomingListings = Array.from({ length: 60 }, () => ({
        listingId: new mongoose.Types.ObjectId().toString(),
        occurredAt: "2026-08-01T11:00:00.000Z",
      }));

      const merged = mergeBuildingFollowersNotifyJobData(
        normalizeBuildingFollowersNotifyJobData(
          newListingPayload({ listings: existingListings }),
        ),
        normalizeBuildingFollowersNotifyJobData(
          newListingPayload({ listings: incomingListings }),
        ),
      );

      assert.equal(merged.listings.length, BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB);
    });
  });

  describe("merges available again payloads", () => {
    test("uses the same listing merge path and preserves change type", () => {
      const listingA = new mongoose.Types.ObjectId().toString();
      const listingB = new mongoose.Types.ObjectId().toString();

      const existing = normalizeBuildingFollowersNotifyJobData(
        availableAgainPayload({
          listings: [
            {
              listingId: listingA,
              availabilityChanged: true,
              occurredAt: "2026-08-01T10:00:00.000Z",
            },
          ],
        }),
      );

      const incoming = normalizeBuildingFollowersNotifyJobData(
        availableAgainPayload({
          occurredAt: "2026-08-01T10:05:00.000Z",
          listings: [
            {
              listingId: listingB,
              availabilityChanged: true,
              occurredAt: "2026-08-01T10:05:00.000Z",
            },
          ],
        }),
      );

      const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

      assert.equal(merged.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN);
      assert.equal(merged.listings.length, 2);
      assert.equal(merged.occurredAt, "2026-08-01T10:05:00.000Z");
    });
  });

  describe("merges price drop payloads", () => {
    test("keeps the lowest newMinRent", () => {
      const merged = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({
          occurredAt: "2026-08-01T10:00:00.000Z",
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: 6500 },
        }),
        priceDropPayload({
          occurredAt: "2026-08-01T10:05:00.000Z",
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: 5500 },
        }),
      );

      assert.equal(merged.metadata.oldMinRent, 7000);
      assert.equal(merged.metadata.newMinRent, 5500);
    });

    test("keeps existing oldMinRent when both payloads define it", () => {
      const merged = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 8000, newMinRent: 7000 },
        }),
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 9000, newMinRent: 6500 },
        }),
      );

      assert.equal(merged.metadata.oldMinRent, 8000);
      assert.equal(merged.metadata.newMinRent, 6500);
    });

    test("uses whichever side provides newMinRent when the other is null", () => {
      const onlyExisting = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: 6500 },
        }),
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: null },
        }),
      );

      const onlyIncoming = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: null },
        }),
        priceDropPayload({
          metadata: { buildingName: "Sky Residence", oldMinRent: 7000, newMinRent: 5500 },
        }),
      );

      assert.equal(onlyExisting.metadata.newMinRent, 6500);
      assert.equal(onlyIncoming.metadata.newMinRent, 5500);
    });

    test("uses the later occurredAt and clears listings", () => {
      const merged = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({ occurredAt: "2026-08-01T10:00:00.000Z" }),
        priceDropPayload({ occurredAt: "2026-08-01T10:05:00.000Z" }),
      );

      assert.equal(merged.occurredAt, "2026-08-01T10:05:00.000Z");
      assert.deepEqual(merged.listings, []);
    });

    test("merges excludeUserIds without listing-level exclusions", () => {
      const excludeA = new mongoose.Types.ObjectId().toString();
      const excludeB = new mongoose.Types.ObjectId().toString();

      const merged = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({ excludeUserIds: [excludeA] }),
        priceDropPayload({ excludeUserIds: [excludeB] }),
      );

      assert.deepEqual(merged.excludeUserIds.sort(), [excludeA, excludeB].sort());
    });

    test("prefers incoming buildingName and falls back to existing", () => {
      const withIncomingName = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({ metadata: { buildingName: "Existing Tower", oldMinRent: 7000, newMinRent: 6500 } }),
        priceDropPayload({ metadata: { buildingName: "Incoming Tower", oldMinRent: 7000, newMinRent: 6000 } }),
      );

      const withFallbackName = mergeBuildingFollowersNotifyJobData(
        priceDropPayload({ metadata: { buildingName: "Existing Tower", oldMinRent: 7000, newMinRent: 6500 } }),
        priceDropPayload({ metadata: { buildingName: null, oldMinRent: 7000, newMinRent: 6000 } }),
      );

      assert.equal(withIncomingName.metadata.buildingName, "Incoming Tower");
      assert.equal(withFallbackName.metadata.buildingName, "Existing Tower");
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves raw payload objects unchanged", () => {
      const existingRaw = newListingPayload({
        listings: [
          {
            listingId: new mongoose.Types.ObjectId().toString(),
            rent: 5000,
            occurredAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      });
      const incomingRaw = newListingPayload({
        occurredAt: "2026-08-01T10:05:00.000Z",
        listings: [
          {
            listingId: new mongoose.Types.ObjectId().toString(),
            rent: 5200,
            occurredAt: "2026-08-01T10:05:00.000Z",
          },
        ],
      });

      const existingSnapshot = structuredClone(existingRaw);
      const incomingSnapshot = structuredClone(incomingRaw);

      mergeBuildingFollowersNotifyJobData(existingRaw, incomingRaw);

      assert.deepEqual(existingRaw, existingSnapshot);
      assert.deepEqual(incomingRaw, incomingSnapshot);
    });
  });
});
