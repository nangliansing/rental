import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildFollowerNotificationContent } from "../modules/building-follow-notify/utils/build-follower-notification-content.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";

describe("buildFollowerNotificationContent", () => {
  test("uses singular copy for one listing", () => {
    const buildingId = new mongoose.Types.ObjectId();
    const listingId = new mongoose.Types.ObjectId();

    const content = buildFollowerNotificationContent({
      event: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
        metadata: { buildingName: "Sky Residence" },
      },
      listings: [
        {
          listingId,
          rent: 5500,
          availableAt: null,
        },
      ],
    });

    assert.equal(content.type, NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING);
    assert.match(content.title, /New listing at Sky Residence/);
    assert.match(content.message, /A new listing is available/);
    assert.equal(content.entityType, NOTIFICATION_ENTITY_TYPES.LISTING);
    assert.equal(content.entityId, listingId.toString());
  });

  test("uses plural copy for multiple listings", () => {
    const buildingId = new mongoose.Types.ObjectId();

    const content = buildFollowerNotificationContent({
      event: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        buildingId,
        metadata: { buildingName: "Sky Residence" },
      },
      listings: [
        { listingId: new mongoose.Types.ObjectId(), rent: 5000 },
        { listingId: new mongoose.Types.ObjectId(), rent: 5200 },
        { listingId: new mongoose.Types.ObjectId(), rent: 5400 },
      ],
    });

    assert.match(content.title, /3 new listings at Sky Residence/);
    assert.match(content.message, /3 new listings are now available at Sky Residence/);
    assert.equal(content.entityType, NOTIFICATION_ENTITY_TYPES.BUILDING);
    assert.equal(content.entityId, buildingId.toString());
    assert.equal(content.metadata.listingCount, 3);
    assert.equal(content.metadata.listingIds.length, 3);
  });

  test("uses plural copy for multiple available-again listings", () => {
    const buildingId = new mongoose.Types.ObjectId();

    const content = buildFollowerNotificationContent({
      event: {
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
        buildingId,
        metadata: { buildingName: "Sky Residence" },
      },
      listings: [
        { listingId: new mongoose.Types.ObjectId(), rent: 5000 },
        { listingId: new mongoose.Types.ObjectId(), rent: 5200 },
      ],
    });

    assert.match(content.title, /2 listings available at Sky Residence/);
    assert.match(content.message, /2 listings at Sky Residence are available again/);
  });
});
