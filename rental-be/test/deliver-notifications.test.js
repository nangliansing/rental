import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import NotificationDedupe from "../modules/notification/notification-dedupe.model.js";
import Notification from "../modules/notification/notification.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import { deliverNotifications } from "../modules/notification/services/deliver-notifications.service.js";
import User from "../modules/user/user.model.js";

let mongoServer;

const createRecipient = ({
  userId,
  dedupeKey,
  buildingId,
  notificationOverrides = {},
}) => ({
  userId: userId.toString(),
  dedupeKey,
  notification: {
    type: NOTIFICATION_TYPES.SYSTEM,
    title: "Rent dropped",
    message: "Now from 5500 baht per month",
    entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
    entityId: buildingId.toString(),
    link: `/buildings/${buildingId.toString()}`,
    metadata: { newMinRent: 5500 },
    ...notificationOverrides,
  },
});

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("deliver_notifications_test"));
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("deliverNotifications", () => {
  test("returns zero counts for an empty recipient list", async () => {
    const result = await deliverNotifications({ recipients: [] });

    assert.deepEqual(result, {
      requested: 0,
      sent: 0,
      skippedDuplicate: 0,
      skippedInvalid: 0,
      realtimePublished: 0,
      realtimeFailed: 0,
      notificationIds: [],
    });
  });

  test("defaults missing recipients to an empty list", async () => {
    const result = await deliverNotifications();

    assert.equal(result.requested, 0);
    assert.equal(result.sent, 0);
  });

  test("bulk inserts notifications and publishes realtime hints", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const users = await User.create([
      {
        name: "Follower One",
        email: "follower-one@example.com",
      },
      {
        name: "Follower Two",
        email: "follower-two@example.com",
      },
    ]);

    const published = [];
    const result = await deliverNotifications({
      recipients: users.map((user) =>
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ),
      publishRealtimeHint: async (hint) => {
        published.push(hint);
      },
    });

    assert.equal(result.requested, 2);
    assert.equal(result.sent, 2);
    assert.equal(result.skippedDuplicate, 0);
    assert.equal(result.skippedInvalid, 0);
    assert.equal(result.realtimePublished, 2);
    assert.equal(result.realtimeFailed, 0);

    const notifications = await Notification.find().sort({ createdAt: 1 }).lean();
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0]?.title, "Rent dropped");
    assert.equal(notifications[0]?.metadata?.newMinRent, 5500);
    assert.equal(notifications[0]?.link, `/buildings/${buildingId.toString()}`);
    assert.equal(notifications[0]?.isRead, false);

    const dedupes = await NotificationDedupe.find().lean();
    assert.equal(dedupes.length, 2);
    assert.ok(dedupes[0]?.notificationId);

    assert.deepEqual(
      published.map((hint) => hint.userId).sort(),
      users.map((user) => user._id.toString()).sort(),
    );
    assert.ok(
      published.every(
        (hint) =>
          typeof hint.notificationId === "string" && hint.notificationId.length > 0,
      ),
    );
  });

  test("skips duplicate dedupe keys for the same user across deliveries", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });
    const recipient = createRecipient({
      userId: user._id,
      buildingId,
      dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
    });

    const first = await deliverNotifications({
      recipients: [recipient],
      publishRealtimeHint: async () => {},
    });
    const second = await deliverNotifications({
      recipients: [recipient],
      publishRealtimeHint: async () => {},
    });

    assert.equal(first.sent, 1);
    assert.equal(second.sent, 0);
    assert.equal(second.skippedDuplicate, 1);
    assert.equal(await Notification.countDocuments(), 1);
    assert.equal(await NotificationDedupe.countDocuments(), 1);
  });

  test("skips duplicate dedupe keys within the same delivery batch", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });
    const recipient = createRecipient({
      userId: user._id,
      buildingId,
      dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
    });

    const result = await deliverNotifications({
      recipients: [recipient, recipient],
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.requested, 2);
    assert.equal(result.sent, 1);
    assert.equal(result.skippedDuplicate, 1);
    assert.equal(await Notification.countDocuments(), 1);
  });

  test("delivers different dedupe keys to the same user in one batch", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });

    const result = await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.new-listing.${buildingId}.${user._id}`,
          notificationOverrides: {
            title: "New listing",
            message: "A new listing is available",
          },
        }),
      ],
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.sent, 2);
    assert.equal(await Notification.countDocuments(), 2);
    assert.equal(await NotificationDedupe.countDocuments(), 2);
  });

  test("delivers the same dedupe key to different users", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const users = await User.create([
      { name: "Follower One", email: "follower-one@example.com" },
      { name: "Follower Two", email: "follower-two@example.com" },
    ]);
    const sharedKey = `followed-building.rent-drop.${buildingId}.shared`;

    const result = await deliverNotifications({
      recipients: users.map((user) =>
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: sharedKey,
        }),
      ),
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.sent, 2);
    assert.equal(await Notification.countDocuments(), 2);
  });

  test("processes recipients across multiple configured batches", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const users = await User.create([
      { name: "Follower One", email: "follower-one@example.com" },
      { name: "Follower Two", email: "follower-two@example.com" },
      { name: "Follower Three", email: "follower-three@example.com" },
    ]);

    const result = await deliverNotifications({
      recipients: users.map((user) =>
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ),
      batchSize: 2,
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.sent, 3);
    assert.equal(result.notificationIds.length, 3);
    assert.equal(await Notification.countDocuments(), 3);
  });

  test("skips invalid recipients without blocking valid ones", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });

    const result = await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
        {
          userId: "not-an-id",
          dedupeKey: "bad:key",
          notification: {},
        },
      ],
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.requested, 2);
    assert.equal(result.sent, 1);
    assert.equal(result.skippedInvalid, 1);
  });

  test("returns only skippedInvalid when every recipient is invalid", async () => {
    const logs = [];
    const logger = {
      warn(entry) {
        logs.push(entry);
      },
      info() {},
      error() {},
    };

    const result = await deliverNotifications({
      recipients: [
        { userId: "bad", dedupeKey: "bad:key", notification: {} },
        { userId: "also-bad", dedupeKey: "still:bad", notification: {} },
      ],
      logger,
    });

    assert.equal(result.requested, 2);
    assert.equal(result.sent, 0);
    assert.equal(result.skippedInvalid, 2);
    assert.equal(result.skippedDuplicate, 0);
    assert.equal(logs.length, 2);
    assert.equal(logs[0]?.event, "deliver_notifications_recipient_invalid");
  });

  test("does not publish realtime hints when emitRealtime is false", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });

    let publishCalls = 0;
    const result = await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ],
      emitRealtime: false,
      publishRealtimeHint: async () => {
        publishCalls += 1;
      },
    });

    assert.equal(result.sent, 1);
    assert.equal(result.realtimePublished, 0);
    assert.equal(publishCalls, 0);
  });

  test("keeps persisted notifications when a realtime hint fails", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });

    const result = await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ],
      publishRealtimeHint: async () => {
        throw new Error("socket offline");
      },
    });

    assert.equal(result.sent, 1);
    assert.equal(result.realtimePublished, 0);
    assert.equal(result.realtimeFailed, 1);
    assert.equal(await Notification.countDocuments(), 1);
  });

  test("counts partial realtime failures in a multi-recipient delivery", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const users = await User.create([
      { name: "Follower One", email: "follower-one@example.com" },
      { name: "Follower Two", email: "follower-two@example.com" },
    ]);
    const failingUserId = users[1]._id.toString();

    const result = await deliverNotifications({
      recipients: users.map((user) =>
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ),
      publishRealtimeHint: async ({ userId }) => {
        if (userId === failingUserId) {
          throw new Error("socket offline");
        }
      },
    });

    assert.equal(result.sent, 2);
    assert.equal(result.realtimePublished, 1);
    assert.equal(result.realtimeFailed, 1);
  });

  test("can deliver again after an expired dedupe entry is cleaned up", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });
    const recipient = createRecipient({
      userId: user._id,
      buildingId,
      dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
    });

    await NotificationDedupe.create({
      recipient: user._id,
      dedupeKey: recipient.dedupeKey,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await deliverNotifications({
      recipients: [recipient],
      publishRealtimeHint: async () => {},
    });

    assert.equal(result.sent, 1);
    assert.equal(await Notification.countDocuments(), 1);
  });

  test("stores a custom dedupe expiry window on dedupe records", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });
    const dedupeWindowMs = 2 * 60 * 60 * 1000;
    const startedAt = Date.now();

    await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ],
      dedupeWindowMs,
      publishRealtimeHint: async () => {},
    });

    const dedupe = await NotificationDedupe.findOne().lean();
    const expectedMin = startedAt + dedupeWindowMs - 1000;
    const expectedMax = startedAt + dedupeWindowMs + 5000;

    assert.ok(dedupe?.expiresAt);
    assert.ok(dedupe.expiresAt.getTime() >= expectedMin);
    assert.ok(dedupe.expiresAt.getTime() <= expectedMax);
  });

  test("logs a completion summary", async () => {
    const buildingId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: "Follower One",
      email: "follower-one@example.com",
    });
    const logs = [];
    const logger = {
      warn() {},
      info(entry) {
        logs.push(entry);
      },
      error() {},
    };

    await deliverNotifications({
      recipients: [
        createRecipient({
          userId: user._id,
          buildingId,
          dedupeKey: `followed-building.rent-drop.${buildingId}.${user._id}`,
        }),
      ],
      logger,
      publishRealtimeHint: async () => {},
    });

    assert.equal(logs.at(-1)?.event, "deliver_notifications_completed");
    assert.equal(logs.at(-1)?.sent, 1);
  });

  test("rejects invalid top-level delivery options", async () => {
    await assert.rejects(
      () =>
        deliverNotifications({
          recipients: [],
          batchSize: 0,
        }),
      /batchSize must be an integer/,
    );
  });
});
