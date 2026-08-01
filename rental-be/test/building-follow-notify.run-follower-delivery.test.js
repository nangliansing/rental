import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";

const mockState = {
  followerPages: [],
  deliverResults: [],
  paginationCalls: [],
  deliverCalls: [],
};

mock.module(
  "../modules/building-follow-notify/utils/paginate-building-followers.js",
  {
    namedExports: {
      paginateBuildingFollowers: async function* paginateBuildingFollowersMock(
        buildingId,
        options,
      ) {
        mockState.paginationCalls.push({ buildingId, options });

        for (const page of mockState.followerPages) {
          yield page;
        }
      },
    },
  },
);

mock.module(
  "../modules/notification/services/deliver-notifications.service.js",
  {
    namedExports: {
      deliverNotifications: async (options) => {
        mockState.deliverCalls.push(options);

        if (mockState.deliverResults.length > 0) {
          return mockState.deliverResults.shift();
        }

        return {
          sent: options.recipients.length,
          skippedDuplicate: 0,
          skippedInvalid: 0,
          realtimePublished: options.recipients.length,
          realtimeFailed: 0,
          notificationIds: options.recipients.map(
            (recipient) => `notification-${recipient.userId}`,
          ),
        };
      },
    },
  },
);

const { runFollowerDelivery } = await import(
  "../modules/building-follow-notify/utils/run-follower-delivery.js"
);

const buildingObjectId = new mongoose.Types.ObjectId();
const followerA = new mongoose.Types.ObjectId();
const followerB = new mongoose.Types.ObjectId();
const OCCURRED_AT = new Date("2026-08-01T10:00:00.000Z");

const resetMockState = () => {
  mockState.followerPages = [];
  mockState.deliverResults = [];
  mockState.paginationCalls = [];
  mockState.deliverCalls = [];
};

const baseEvent = (overrides = {}) => ({
  changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
  buildingId: buildingObjectId,
  occurredAt: OCCURRED_AT,
  excludeUserIds: [],
  listings: [
    {
      listingId: new mongoose.Types.ObjectId().toString(),
      rent: 5500,
      occurredAt: OCCURRED_AT.toISOString(),
    },
  ],
  metadata: {
    buildingName: "Original Tower",
  },
  ...overrides,
});

const recipient = (userId) => ({
  userId: userId.toString(),
  dedupeKey: `followed-building.new-listing.${buildingObjectId}.${userId}.listing-a`,
  notification: {
    type: "FOLLOWED_BUILDING_NEW_LISTING",
    title: "New listing",
    message: "A new listing is available.",
    entityType: "LISTING",
    entityId: new mongoose.Types.ObjectId().toString(),
    link: "/listings/a",
    metadata: {},
  },
});

const runDelivery = (overrides = {}) =>
  runFollowerDelivery({
    event: baseEvent(),
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    listingCount: 1,
    metadata: {
      buildingName: "Sky Residence",
    },
    buildRecipientsForPage: (followers) =>
      followers.map((follower) => recipient(follower.userId)),
    logger: null,
    publishRealtimeHint: null,
    jobId: "job-123",
    ...overrides,
  });

describe("runFollowerDelivery", () => {
  afterEach(() => {
    resetMockState();
  });

  describe("paginates followers and builds recipients", () => {
    test("returns zero-delivery stats when there are no follower pages", async () => {
      const result = await runDelivery();

      assert.deepEqual(result, {
        ok: true,
        skipped: false,
        changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
        listingCount: 1,
        requested: 0,
        sent: 0,
        skippedDuplicate: 0,
        skippedInvalid: 0,
        realtimePublished: 0,
        realtimeFailed: 0,
        notificationIds: [],
      });
      assert.equal(mockState.deliverCalls.length, 0);
    });

    test("paginates followers using the building id and occurredAt cutoff", async () => {
      const event = baseEvent();

      await runDelivery({ event });

      assert.equal(mockState.paginationCalls.length, 1);
      assert.equal(mockState.paginationCalls[0].buildingId, event.buildingId);
      assert.deepEqual(mockState.paginationCalls[0].options, {
        followedBefore: event.occurredAt,
      });
    });

    test("passes merged metadata to buildRecipientsForPage", async () => {
      mockState.followerPages = [[{ userId: followerA, createdAt: OCCURRED_AT }]];

      let capturedNotificationEvent;

      await runDelivery({
        metadata: {
          buildingName: "Merged Tower",
          listingCount: 1,
        },
        buildRecipientsForPage: (followers, notificationEvent) => {
          capturedNotificationEvent = notificationEvent;
          return [recipient(followers[0].userId)];
        },
      });

      assert.equal(capturedNotificationEvent.metadata.buildingName, "Merged Tower");
      assert.equal(capturedNotificationEvent.metadata.listingCount, 1);
    });

    test("skips follower pages that produce no recipients", async () => {
      mockState.followerPages = [
        [{ userId: followerA, createdAt: OCCURRED_AT }],
        [{ userId: followerB, createdAt: OCCURRED_AT }],
      ];

      const result = await runDelivery({
        buildRecipientsForPage: (followers) => {
          if (followers[0].userId.toString() === followerA.toString()) {
            return [];
          }

          return [recipient(followers[0].userId)];
        },
      });

      assert.equal(mockState.deliverCalls.length, 1);
      assert.equal(result.requested, 1);
      assert.equal(result.sent, 1);
      assert.deepEqual(result.notificationIds, [`notification-${followerB.toString()}`]);
    });
  });

  describe("delivers notifications and aggregates results", () => {
    test("delivers recipients from a single follower page", async () => {
      mockState.followerPages = [[{ userId: followerA, createdAt: OCCURRED_AT }]];

      const result = await runDelivery();

      assert.equal(mockState.deliverCalls.length, 1);
      assert.equal(mockState.deliverCalls[0].recipients.length, 1);
      assert.equal(result.requested, 1);
      assert.equal(result.sent, 1);
      assert.equal(result.realtimePublished, 1);
      assert.deepEqual(result.notificationIds, [`notification-${followerA.toString()}`]);
    });

    test("aggregates delivery stats across multiple follower pages", async () => {
      mockState.followerPages = [
        [{ userId: followerA, createdAt: OCCURRED_AT }],
        [{ userId: followerB, createdAt: OCCURRED_AT }],
      ];
      mockState.deliverResults = [
        {
          sent: 1,
          skippedDuplicate: 0,
          skippedInvalid: 0,
          realtimePublished: 1,
          realtimeFailed: 0,
          notificationIds: ["notification-a"],
        },
        {
          sent: 0,
          skippedDuplicate: 1,
          skippedInvalid: 0,
          realtimePublished: 0,
          realtimeFailed: 1,
          notificationIds: [],
        },
      ];

      const result = await runDelivery();

      assert.equal(mockState.deliverCalls.length, 2);
      assert.equal(result.requested, 2);
      assert.equal(result.sent, 1);
      assert.equal(result.skippedDuplicate, 1);
      assert.equal(result.skippedInvalid, 0);
      assert.equal(result.realtimePublished, 1);
      assert.equal(result.realtimeFailed, 1);
      assert.deepEqual(result.notificationIds, ["notification-a"]);
    });

    test("forwards logger and publishRealtimeHint to deliverNotifications", async () => {
      mockState.followerPages = [[{ userId: followerA, createdAt: OCCURRED_AT }]];

      const logger = { info() {}, warn() {} };
      const publishRealtimeHint = async () => {};

      await runDelivery({ logger, publishRealtimeHint });

      assert.equal(mockState.deliverCalls[0].logger, logger);
      assert.equal(mockState.deliverCalls[0].publishRealtimeHint, publishRealtimeHint);
    });
  });

  describe("logs completion", () => {
    test("logs info when deliveries succeed", async () => {
      mockState.followerPages = [[{ userId: followerA, createdAt: OCCURRED_AT }]];

      const logs = [];

      const result = await runDelivery({
        logger: {
          info(entry, message) {
            logs.push({ level: "info", entry, message });
          },
          warn(entry, message) {
            logs.push({ level: "warn", entry, message });
          },
        },
      });

      assert.equal(result.sent, 1);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].level, "info");
      assert.equal(logs[0].entry.event, "building_followers_notify_completed");
      assert.equal(logs[0].entry.requested, 1);
      assert.equal(logs[0].entry.sent, 1);
      assert.equal(logs[0].entry.jobId, "job-123");
      assert.equal(logs[0].message, "Completed building follower notification job");
    });

    test("logs a warning when recipients were requested but none were delivered", async () => {
      mockState.followerPages = [[{ userId: followerA, createdAt: OCCURRED_AT }]];
      mockState.deliverResults = [
        {
          sent: 0,
          skippedDuplicate: 1,
          skippedInvalid: 0,
          realtimePublished: 0,
          realtimeFailed: 0,
          notificationIds: [],
        },
      ];

      const logs = [];

      const result = await runDelivery({
        logger: {
          info(entry, message) {
            logs.push({ level: "info", entry, message });
          },
          warn(entry, message) {
            logs.push({ level: "warn", entry, message });
          },
        },
      });

      assert.equal(result.requested, 1);
      assert.equal(result.sent, 0);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].level, "warn");
      assert.equal(logs[0].entry.skippedDuplicate, 1);
      assert.equal(
        logs[0].message,
        "Building follower notification job completed with zero deliveries",
      );
    });

    test("logs info when there were no recipients to deliver", async () => {
      const logs = [];

      await runDelivery({
        logger: {
          info(entry, message) {
            logs.push({ level: "info", entry, message });
          },
          warn(entry, message) {
            logs.push({ level: "warn", entry, message });
          },
        },
      });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].level, "info");
      assert.equal(logs[0].entry.requested, 0);
      assert.equal(logs[0].entry.sent, 0);
    });
  });
});
