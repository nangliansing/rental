import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  DEDUPE_KEY_MAX_LENGTH,
  DELIVER_NOTIFICATIONS_BATCH_SIZE,
  DELIVER_NOTIFICATIONS_MAX_RECIPIENTS,
} from "../modules/notification/notification-delivery.constants.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../modules/notification/notification.constants.js";
import {
  validateDeliverNotificationRecipient,
  validateDeliverNotificationsOptions,
} from "../modules/notification/notification-delivery.validation.js";

const buildingId = new mongoose.Types.ObjectId().toString();
const userId = new mongoose.Types.ObjectId().toString();

const validRecipient = (overrides = {}) => ({
  userId,
  dedupeKey: "followed-building.rent-drop.building-1.user-1",
  notification: {
    type: NOTIFICATION_TYPES.SYSTEM,
    title: "Rent dropped",
    message: "Now from 5500 baht per month",
    entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
    entityId: buildingId,
  },
  ...overrides,
});

describe("validateDeliverNotificationRecipient", () => {
  test("accepts a valid recipient payload", () => {
    const parsed = validateDeliverNotificationRecipient(validRecipient());

    assert.equal(parsed.userId.toString(), userId);
    assert.equal(parsed.dedupeKey, "followed-building.rent-drop.building-1.user-1");
    assert.equal(parsed.notification.title, "Rent dropped");
  });

  test("rejects invalid user ids", () => {
    assert.throws(
      () => validateDeliverNotificationRecipient(validRecipient({ userId: "bad-id" })),
      AppError,
    );
  });

  test("rejects invalid dedupe keys", () => {
    for (const dedupeKey of ["", "   ", "bad:key", "has space"]) {
      assert.throws(
        () => validateDeliverNotificationRecipient(validRecipient({ dedupeKey })),
        AppError,
        `Expected rejection for dedupeKey ${JSON.stringify(dedupeKey)}`,
      );
    }
  });

  test("rejects dedupe keys that are too long", () => {
    assert.throws(
      () =>
        validateDeliverNotificationRecipient(
          validRecipient({ dedupeKey: "a".repeat(DEDUPE_KEY_MAX_LENGTH + 1) }),
        ),
      AppError,
    );
  });

  test("rejects building notifications without entityId", () => {
    assert.throws(
      () =>
        validateDeliverNotificationRecipient(
          validRecipient({
            notification: {
              type: NOTIFICATION_TYPES.SYSTEM,
              title: "Rent dropped",
              message: "Now from 5500 baht per month",
              entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
            },
          }),
        ),
      AppError,
    );
  });

  test("rejects external notification links", () => {
    assert.throws(
      () =>
        validateDeliverNotificationRecipient(
          validRecipient({
            notification: {
              ...validRecipient().notification,
              link: "https://example.com",
            },
          }),
        ),
      AppError,
    );
  });

  test("rejects oversized titles and messages", () => {
    assert.throws(
      () =>
        validateDeliverNotificationRecipient(
          validRecipient({
            notification: {
              ...validRecipient().notification,
              title: "x".repeat(121),
            },
          }),
        ),
      AppError,
    );

    assert.throws(
      () =>
        validateDeliverNotificationRecipient(
          validRecipient({
            notification: {
              ...validRecipient().notification,
              message: "x".repeat(501),
            },
          }),
        ),
      AppError,
    );
  });
});

describe("validateDeliverNotificationsOptions", () => {
  test("accepts valid delivery options", () => {
    const parsed = validateDeliverNotificationsOptions({
      recipients: [validRecipient()],
      batchSize: 100,
      dedupeWindowMs: 3600000,
      emitRealtime: false,
    });

    assert.equal(parsed.batchSize, 100);
    assert.equal(parsed.dedupeWindowMs, 3600000);
    assert.equal(parsed.emitRealtime, false);
  });

  test("defaults batch size and emitRealtime", () => {
    const parsed = validateDeliverNotificationsOptions({
      recipients: [],
    });

    assert.equal(parsed.batchSize, DELIVER_NOTIFICATIONS_BATCH_SIZE);
    assert.equal(parsed.emitRealtime, true);
    assert.equal(parsed.publishRealtimeHint, null);
  });

  test("rejects non-array recipients", () => {
    assert.throws(
      () => validateDeliverNotificationsOptions({ recipients: "nope" }),
      /recipients must be an array/,
    );
  });

  test("rejects oversized recipient lists", () => {
    assert.throws(
      () =>
        validateDeliverNotificationsOptions({
          recipients: Array.from({ length: DELIVER_NOTIFICATIONS_MAX_RECIPIENTS + 1 }, () =>
            validRecipient(),
          ),
        }),
      /recipients must contain at most/,
    );
  });

  test("rejects invalid batch sizes", () => {
    for (const batchSize of [0, -1, 1.5, DELIVER_NOTIFICATIONS_BATCH_SIZE + 1]) {
      assert.throws(
        () =>
          validateDeliverNotificationsOptions({
            recipients: [],
            batchSize,
          }),
        /batchSize must be an integer/,
      );
    }
  });

  test("rejects invalid dedupe windows", () => {
    for (const dedupeWindowMs of [59_999, 7 * 24 * 60 * 60 * 1000 + 1, 1.5]) {
      assert.throws(
        () =>
          validateDeliverNotificationsOptions({
            recipients: [],
            dedupeWindowMs,
          }),
        /dedupeWindowMs must be an integer/,
      );
    }
  });

  test("rejects invalid emitRealtime and publishRealtimeHint types", () => {
    assert.throws(
      () =>
        validateDeliverNotificationsOptions({
          recipients: [],
          emitRealtime: "yes",
        }),
      /emitRealtime must be a boolean/,
    );

    assert.throws(
      () =>
        validateDeliverNotificationsOptions({
          recipients: [],
          publishRealtimeHint: "not-a-function",
        }),
      /publishRealtimeHint must be a function/,
    );
  });
});
