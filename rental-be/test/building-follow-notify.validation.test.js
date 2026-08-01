import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import {
  validateBuildingFollowersNotifyEvent,
} from "../modules/building-follow-notify/validate-building-followers-notify-event.js";

describe("validateBuildingFollowersNotifyEvent", () => {
  test("validates a price drop event", () => {
    const buildingId = new mongoose.Types.ObjectId();

    const event = validateBuildingFollowersNotifyEvent({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
      buildingId,
      occurredAt: "2026-08-01T10:00:00.000Z",
      metadata: {
        buildingName: "River Tower",
        oldMinRent: 7000,
        newMinRent: 5500,
      },
    });

    assert.equal(event.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED);
    assert.equal(event.buildingId.toString(), buildingId.toString());
    assert.equal(event.metadata.oldMinRent, 7000);
    assert.equal(event.metadata.newMinRent, 5500);
  });

  test("requires listings for listing-specific events", () => {
    const buildingId = new mongoose.Types.ObjectId();

    assert.throws(
      () =>
        validateBuildingFollowersNotifyEvent({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
          buildingId,
          metadata: {
            buildingName: "River Tower",
          },
        }),
      (error) => error instanceof AppError && error.statusCode === 422,
    );
  });

  test("validates legacy single-listing payloads", () => {
    const buildingId = new mongoose.Types.ObjectId();
    const listingId = new mongoose.Types.ObjectId();

    const event = validateBuildingFollowersNotifyEvent({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      listingId,
      occurredAt: "2026-08-01T10:00:00.000Z",
      metadata: {
        buildingName: "River Tower",
        rent: 5000,
      },
    });

    assert.equal(event.listings.length, 1);
    assert.equal(event.listings[0].listingId.toString(), listingId.toString());
  });

  test("validates merged listing batches", () => {
    const buildingId = new mongoose.Types.ObjectId();
    const listingIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    const event = validateBuildingFollowersNotifyEvent({
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
      buildingId,
      occurredAt: "2026-08-01T10:00:00.000Z",
      listings: listingIds.map((listingId, index) => ({
        listingId,
        rent: 5000 + index * 100,
        occurredAt: `2026-08-01T10:0${index}:00.000Z`,
      })),
      metadata: {
        buildingName: "River Tower",
      },
    });

    assert.equal(event.listings.length, 3);
  });
});
