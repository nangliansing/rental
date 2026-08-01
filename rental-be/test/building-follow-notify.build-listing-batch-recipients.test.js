import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { buildListingBatchRecipients } from "../modules/building-follow-notify/utils/build-follower-recipients.js";
import { buildFollowerDedupeKey } from "../modules/building-follow-notify/utils/build-follower-dedupe-key.js";
import { buildFollowerNotificationContent } from "../modules/building-follow-notify/utils/build-follower-notification-content.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";

const buildingObjectId = new mongoose.Types.ObjectId();
const buildingId = buildingObjectId.toString();
const followerA = new mongoose.Types.ObjectId();
const followerB = new mongoose.Types.ObjectId();
const excludedFollower = new mongoose.Types.ObjectId();
const listingA = new mongoose.Types.ObjectId();
const listingB = new mongoose.Types.ObjectId();
const listingC = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();

const listingEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId,
  excludeUserIds: [],
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

const availableAgainEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
  buildingId,
  excludeUserIds: [],
  metadata: { buildingName: "Sky Residence" },
  ...overrides,
});

const follower = (userId, createdAt = "2026-07-01T10:00:00.000Z", overrides = {}) => ({
  userId,
  createdAt: new Date(createdAt),
  ...overrides,
});

const listingEntry = (listingId, occurredAt, overrides = {}) => ({
  listingId: listingId.toString(),
  rent: 5500,
  occurredAt,
  ...overrides,
});

const eligibleListings = () => [
  listingEntry(listingA, "2026-08-01T10:00:00.000Z"),
  listingEntry(listingB, "2026-08-01T11:00:00.000Z"),
  listingEntry(listingC, "2026-08-01T12:00:00.000Z"),
];

describe("buildListingBatchRecipients", () => {
  describe("builds recipients from followers and listings", () => {
    test("returns an empty array when there are no followers", () => {
      assert.deepEqual(
        buildListingBatchRecipients({
          followers: [],
          event: listingEvent(),
          eligibleListings: eligibleListings(),
        }),
        [],
      );
    });

    test("builds one recipient per follower with eligible listings", () => {
      const listings = eligibleListings();
      const event = listingEvent();
      const recipients = buildListingBatchRecipients({
        followers: [follower(followerA), follower(followerB)],
        event,
        eligibleListings: listings,
      });

      assert.equal(recipients.length, 2);
      assert.deepEqual(
        recipients.map((entry) => entry.userId).sort(),
        [followerA.toString(), followerB.toString()].sort(),
      );

      for (const recipient of recipients) {
        assert.equal(recipient.notification.type, NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING);
        assert.deepEqual(
          recipient.notification.metadata.listingIds.sort(),
          [listingA.toString(), listingB.toString(), listingC.toString()].sort(),
        );
      }
    });

    test("personalizes listings per follower based on follow date", () => {
      const listings = eligibleListings();
      const event = listingEvent();

      const recipients = buildListingBatchRecipients({
        followers: [
          follower(followerA, "2026-07-01T10:00:00.000Z"),
          follower(followerB, "2026-08-01T10:30:00.000Z"),
        ],
        event,
        eligibleListings: listings,
      });

      const byUserId = Object.fromEntries(
        recipients.map((entry) => [entry.userId, entry]),
      );

      assert.deepEqual(
        byUserId[followerA.toString()].notification.metadata.listingIds.sort(),
        [listingA.toString(), listingB.toString(), listingC.toString()].sort(),
      );
      assert.deepEqual(
        byUserId[followerB.toString()].notification.metadata.listingIds.sort(),
        [listingB.toString(), listingC.toString()].sort(),
      );
    });
  });

  describe("skips ineligible followers", () => {
    test("skips followers without a userId", () => {
      const recipients = buildListingBatchRecipients({
        followers: [follower(null), follower(undefined), {}, follower(followerA)],
        event: listingEvent(),
        eligibleListings: eligibleListings(),
      });

      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].userId, followerA.toString());
    });

    test("skips followers listed in excludeUserIds", () => {
      const recipients = buildListingBatchRecipients({
        followers: [
          follower(followerA),
          follower(excludedFollower),
          follower(followerB),
        ],
        event: listingEvent({
          excludeUserIds: [excludedFollower.toString()],
        }),
        eligibleListings: eligibleListings(),
      });

      assert.deepEqual(
        recipients.map((entry) => entry.userId).sort(),
        [followerA.toString(), followerB.toString()].sort(),
      );
    });

    test("skips followers with no eligible listings after follow-date filtering", () => {
      const recipients = buildListingBatchRecipients({
        followers: [
          follower(followerA, "2026-08-01T13:00:00.000Z"),
          follower(followerB, "2026-07-01T10:00:00.000Z"),
        ],
        event: listingEvent(),
        eligibleListings: eligibleListings(),
      });

      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].userId, followerB.toString());
    });
  });

  describe("filters listing ownership exclusions", () => {
    test("removes listings owned by the follower via excludeUserId", () => {
      const listings = [
        listingEntry(listingA, "2026-08-01T10:00:00.000Z", {
          excludeUserId: followerA.toString(),
        }),
        listingEntry(listingB, "2026-08-01T11:00:00.000Z"),
      ];

      const recipients = buildListingBatchRecipients({
        followers: [follower(followerA), follower(followerB)],
        event: listingEvent(),
        eligibleListings: listings,
      });

      const byUserId = Object.fromEntries(
        recipients.map((entry) => [entry.userId, entry]),
      );

      assert.deepEqual(
        byUserId[followerA.toString()].notification.metadata.listingIds,
        [listingB.toString()],
      );
      assert.deepEqual(
        byUserId[followerB.toString()].notification.metadata.listingIds.sort(),
        [listingA.toString(), listingB.toString()].sort(),
      );
    });

    test("normalizes ObjectId listing excludeUserId values", () => {
      const listings = [
        listingEntry(listingA, "2026-08-01T10:00:00.000Z", {
          excludeUserId: ownerId,
        }),
      ];

      const recipients = buildListingBatchRecipients({
        followers: [follower(ownerId)],
        event: listingEvent(),
        eligibleListings: listings,
      });

      assert.deepEqual(recipients, []);
    });
  });

  describe("builds dedupe keys and notifications from follower listings", () => {
    test("uses the follower-specific listing batch in the dedupe key", () => {
      const listings = eligibleListings();
      const event = listingEvent();
      const recipients = buildListingBatchRecipients({
        followers: [follower(followerA, "2026-08-01T10:30:00.000Z")],
        event,
        eligibleListings: listings,
      });

      const followerListings = listings.slice(1);

      assert.equal(
        recipients[0].dedupeKey,
        buildFollowerDedupeKey({
          changeType: event.changeType,
          buildingId,
          userId: followerA.toString(),
          listings: followerListings,
        }),
      );
    });

    test("builds single-listing notifications when a follower has one listing", () => {
      const listings = [listingEntry(listingA, "2026-08-01T10:00:00.000Z")];
      const event = listingEvent();
      const recipients = buildListingBatchRecipients({
        followers: [follower(followerA)],
        event,
        eligibleListings: listings,
      });

      const expectedNotification = buildFollowerNotificationContent({
        event,
        listings,
      });

      assert.deepEqual(recipients[0].notification, expectedNotification);
      assert.equal(
        recipients[0].notification.entityType,
        NOTIFICATION_ENTITY_TYPES.LISTING,
      );
      assert.equal(recipients[0].notification.entityId, listingA.toString());
    });

    test("supports available-again events", () => {
      const listings = [
        listingEntry(listingA, "2026-08-01T10:00:00.000Z", {
          availabilityChanged: true,
        }),
      ];
      const event = availableAgainEvent();
      const recipients = buildListingBatchRecipients({
        followers: [follower(followerA)],
        event,
        eligibleListings: listings,
      });

      assert.equal(
        recipients[0].notification.type,
        NOTIFICATION_TYPES.FOLLOWED_BUILDING_AVAILABLE_AGAIN,
      );
      assert.equal(
        recipients[0].dedupeKey,
        buildFollowerDedupeKey({
          changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
          buildingId,
          userId: followerA.toString(),
          listings,
        }),
      );
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves followers, event, and listings unchanged", () => {
      const followers = [follower(followerA), follower(followerB)];
      const event = listingEvent({
        excludeUserIds: [excludedFollower.toString()],
      });
      const listings = eligibleListings();

      const followersSnapshot = followers.map((entry) => ({
        userId: entry.userId.toString(),
        createdAt: entry.createdAt.toISOString(),
      }));
      const listingsSnapshot = listings.map((entry) => structuredClone(entry));
      const eventSnapshot = structuredClone({
        ...event,
        buildingId: event.buildingId.toString(),
      });

      buildListingBatchRecipients({
        followers,
        event,
        eligibleListings: listings,
      });

      assert.deepEqual(
        followers.map((entry) => ({
          userId: entry.userId.toString(),
          createdAt: entry.createdAt.toISOString(),
        })),
        followersSnapshot,
      );
      assert.deepEqual(listings, listingsSnapshot);
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
