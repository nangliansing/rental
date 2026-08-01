import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import {
  filterEligibleListingsForFollower,
  mergeBuildingFollowersNotifyJobData,
  normalizeBuildingFollowersNotifyJobData,
} from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";

describe("mergeBuildingFollowersNotifyJobData", () => {
  test("normalizes legacy single-listing job payloads", () => {
    const listingId = new mongoose.Types.ObjectId();

    const normalized = normalizeBuildingFollowersNotifyJobData({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId: new mongoose.Types.ObjectId().toString(),
      listingId: listingId.toString(),
      occurredAt: "2026-08-01T10:00:00.000Z",
      excludeUserId: new mongoose.Types.ObjectId().toString(),
      metadata: {
        buildingName: "Sky Residence",
        rent: 5500,
      },
    });

    assert.equal(normalized.listings.length, 1);
    assert.equal(normalized.listings[0].listingId, listingId.toString());
    assert.equal(normalized.excludeUserIds.length, 1);
  });

  test("merges multiple new listings into one debounced job payload", () => {
    const buildingId = new mongoose.Types.ObjectId().toString();
    const listingA = new mongoose.Types.ObjectId().toString();
    const listingB = new mongoose.Types.ObjectId().toString();
    const listingC = new mongoose.Types.ObjectId().toString();

    const first = normalizeBuildingFollowersNotifyJobData({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      occurredAt: "2026-08-01T10:00:00.000Z",
      listings: [
        {
          listingId: listingA,
          rent: 5000,
          occurredAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      metadata: { buildingName: "Sky Residence" },
    });

    const second = normalizeBuildingFollowersNotifyJobData({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
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
      metadata: { buildingName: "Sky Residence" },
    });

    const merged = mergeBuildingFollowersNotifyJobData(first, second);

    assert.equal(merged.listings.length, 3);
    assert.equal(merged.occurredAt, "2026-08-01T10:07:00.000Z");
    assert.deepEqual(
      merged.listings.map((listing) => listing.listingId).sort(),
      [listingA, listingB, listingC].sort(),
    );
  });

  test("deduplicates listing ids when the same listing is enqueued twice", () => {
    const buildingId = new mongoose.Types.ObjectId().toString();
    const listingId = new mongoose.Types.ObjectId().toString();

    const existing = normalizeBuildingFollowersNotifyJobData({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      occurredAt: "2026-08-01T10:00:00.000Z",
      listings: [{ listingId, rent: 5000, occurredAt: "2026-08-01T10:00:00.000Z" }],
      metadata: { buildingName: "Sky Residence" },
    });

    const incoming = normalizeBuildingFollowersNotifyJobData({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      occurredAt: "2026-08-01T10:03:00.000Z",
      listings: [{ listingId, rent: 4800, occurredAt: "2026-08-01T10:03:00.000Z" }],
      metadata: { buildingName: "Sky Residence" },
    });

    const merged = mergeBuildingFollowersNotifyJobData(existing, incoming);

    assert.equal(merged.listings.length, 1);
    assert.equal(merged.listings[0].rent, 4800);
    assert.equal(merged.listings[0].occurredAt, "2026-08-01T10:03:00.000Z");
  });

  test("merges price drops by keeping the lowest newMinRent", () => {
    const buildingId = new mongoose.Types.ObjectId().toString();

    const merged = mergeBuildingFollowersNotifyJobData(
      {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId,
        occurredAt: "2026-08-01T10:00:00.000Z",
        metadata: {
          buildingName: "Sky Residence",
          oldMinRent: 7000,
          newMinRent: 6500,
        },
      },
      {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
        buildingId,
        occurredAt: "2026-08-01T10:05:00.000Z",
        metadata: {
          buildingName: "Sky Residence",
          oldMinRent: 7000,
          newMinRent: 5500,
        },
      },
    );

    assert.equal(merged.metadata.oldMinRent, 7000);
    assert.equal(merged.metadata.newMinRent, 5500);
  });

  test("filters listings per follower based on follow date", () => {
    const listings = [
      {
        listingId: "a",
        occurredAt: "2026-08-01T10:00:00.000Z",
      },
      {
        listingId: "b",
        occurredAt: "2026-08-01T11:00:00.000Z",
      },
      {
        listingId: "c",
        occurredAt: "2026-08-01T12:00:00.000Z",
      },
    ];

    const eligible = filterEligibleListingsForFollower(
      { createdAt: new Date("2026-08-01T10:30:00.000Z") },
      listings,
    );

    assert.deepEqual(
      eligible.map((listing) => listing.listingId),
      ["b", "c"],
    );
  });
});
