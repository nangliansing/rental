import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_DEDUPE_PREFIX,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildPriceDropRecipients } from "../modules/building-follow-notify/utils/build-follower-recipients.js";
import { buildFollowerNotificationContent } from "../modules/building-follow-notify/utils/build-follower-notification-content.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";

const buildingObjectId = new mongoose.Types.ObjectId();
const buildingId = buildingObjectId.toString();
const followerA = new mongoose.Types.ObjectId();
const followerB = new mongoose.Types.ObjectId();
const followerC = new mongoose.Types.ObjectId();
const excludedFollower = new mongoose.Types.ObjectId();

const priceDropEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
  buildingId,
  excludeUserIds: [],
  metadata: {
    buildingName: "Sky Residence",
    oldMinRent: 7000,
    newMinRent: 6500,
  },
  ...overrides,
});

const follower = (userId, overrides = {}) => ({
  userId,
  createdAt: new Date("2026-07-01T10:00:00.000Z"),
  ...overrides,
});

const expectedDedupeKey = (userId, newMinRent = 6500) =>
  `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.rent-drop.${buildingId}.${userId.toString()}.${newMinRent}`;

describe("buildPriceDropRecipients", () => {
  describe("builds recipients from followers", () => {
    test("returns an empty array when there are no followers", () => {
      assert.deepEqual(
        buildPriceDropRecipients({
          followers: [],
          event: priceDropEvent(),
        }),
        [],
      );
    });

    test("builds one recipient per eligible follower", () => {
      const event = priceDropEvent();
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA), follower(followerB)],
        event,
      });

      assert.equal(recipients.length, 2);
      assert.deepEqual(
        recipients.map((entry) => entry.userId).sort(),
        [followerA.toString(), followerB.toString()].sort(),
      );
    });

    test("uses the same price-drop notification content for every recipient", () => {
      const event = priceDropEvent();
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA), follower(followerB)],
        event,
      });

      const expectedNotification = buildFollowerNotificationContent({
        event,
        listings: [],
      });

      assert.deepEqual(recipients[0].notification, expectedNotification);
      assert.deepEqual(recipients[1].notification, expectedNotification);
      assert.equal(
        recipients[0].notification.type,
        NOTIFICATION_TYPES.FOLLOWED_BUILDING_PRICE_DROPPED,
      );
      assert.equal(
        recipients[0].notification.entityType,
        NOTIFICATION_ENTITY_TYPES.BUILDING,
      );
      assert.equal(recipients[0].notification.entityId, buildingId);
      assert.equal(recipients[0].notification.metadata.oldMinRent, 7000);
      assert.equal(recipients[0].notification.metadata.newMinRent, 6500);
    });
  });

  describe("skips ineligible followers", () => {
    test("skips followers without a userId", () => {
      const recipients = buildPriceDropRecipients({
        followers: [
          follower(null),
          follower(undefined),
          {},
          follower(followerA),
        ],
        event: priceDropEvent(),
      });

      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].userId, followerA.toString());
    });

    test("skips followers listed in excludeUserIds", () => {
      const recipients = buildPriceDropRecipients({
        followers: [
          follower(followerA),
          follower(excludedFollower),
          follower(followerB),
        ],
        event: priceDropEvent({
          excludeUserIds: [excludedFollower.toString()],
        }),
      });

      assert.deepEqual(
        recipients.map((entry) => entry.userId).sort(),
        [followerA.toString(), followerB.toString()].sort(),
      );
    });

    test("normalizes ObjectId excludeUserIds before filtering", () => {
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA), follower(excludedFollower)],
        event: priceDropEvent({
          excludeUserIds: [excludedFollower],
        }),
      });

      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].userId, followerA.toString());
    });
  });

  describe("builds dedupe keys from the price drop metadata", () => {
    test("uses the follower userId and newMinRent in the dedupe key", () => {
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA)],
        event: priceDropEvent(),
      });

      assert.equal(recipients[0].dedupeKey, expectedDedupeKey(followerA, 6500));
    });

    test("normalizes ObjectId follower ids in the dedupe key", () => {
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA)],
        event: priceDropEvent({
          buildingId: buildingObjectId,
        }),
      });

      assert.equal(recipients[0].userId, followerA.toString());
      assert.equal(recipients[0].dedupeKey, expectedDedupeKey(followerA, 6500));
    });

    test('uses "unknown" in the dedupe key when newMinRent is missing', () => {
      const recipients = buildPriceDropRecipients({
        followers: [follower(followerA)],
        event: priceDropEvent({
          metadata: {
            buildingName: "Sky Residence",
            oldMinRent: 7000,
            newMinRent: null,
          },
        }),
      });

      assert.equal(
        recipients[0].dedupeKey,
        `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.rent-drop.${buildingId}.${followerA.toString()}.unknown`,
      );
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves followers and event unchanged", () => {
      const followers = [follower(followerA), follower(followerB)];
      const event = priceDropEvent({
        excludeUserIds: [excludedFollower.toString()],
      });
      const followersSnapshot = followers.map((entry) => ({
        userId: entry.userId.toString(),
        createdAt: entry.createdAt.toISOString(),
      }));
      const eventSnapshot = structuredClone({
        ...event,
        buildingId: event.buildingId.toString(),
      });

      buildPriceDropRecipients({ followers, event });

      assert.deepEqual(
        followers.map((entry) => ({
          userId: entry.userId.toString(),
          createdAt: entry.createdAt.toISOString(),
        })),
        followersSnapshot,
      );
      assert.deepEqual(
        {
          ...event,
          buildingId: event.buildingId.toString(),
        },
        eventSnapshot,
      );
    });
  });
});
