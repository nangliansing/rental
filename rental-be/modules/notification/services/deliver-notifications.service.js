import NotificationDedupe from "../notification-dedupe.model.js";
import Notification from "../notification.model.js";
import {
  DELIVER_NOTIFICATIONS_DEFAULT_DEDUPE_WINDOW_MS,
  REALTIME_HINT_PUBLISH_CONCURRENCY,
} from "../notification-delivery.constants.js";
import {
  validateDeliverNotificationRecipient,
  validateDeliverNotificationsOptions,
} from "../notification-delivery.validation.js";
import { buildCreateNotificationRecord } from "../mappers/index.js";

const DUPLICATE_KEY_ERROR_CODE = 11000;

const dedupePairKey = (recipient, dedupeKey) =>
  `${recipient.toString()}:${dedupeKey}`;

const normalizeRecipients = (recipients, logger) => {
  const normalized = [];
  let skippedInvalid = 0;

  for (const recipient of recipients) {
    try {
      normalized.push(validateDeliverNotificationRecipient(recipient));
    } catch (error) {
      skippedInvalid += 1;
      logger?.warn?.(
        {
          err: error,
          event: "deliver_notifications_recipient_invalid",
        },
        "Skipped invalid notification recipient",
      );
    }
  }

  return { normalized, skippedInvalid };
};

const removeExpiredDedupeEntries = async (recipients, session) => {
  if (recipients.length === 0) return;

  const now = new Date();
  await NotificationDedupe.deleteMany(
    {
      $or: recipients.map((recipient) => ({
        recipient: recipient.userId,
        dedupeKey: recipient.dedupeKey,
        expiresAt: { $lte: now },
      })),
    },
    { session },
  );
};

const findActiveDedupeKeys = async (recipients, session) => {
  if (recipients.length === 0) return new Set();

  const now = new Date();
  const activeEntries = await NotificationDedupe.find({
    $or: recipients.map((recipient) => ({
      recipient: recipient.userId,
      dedupeKey: recipient.dedupeKey,
      expiresAt: { $gt: now },
    })),
  })
    .select("recipient dedupeKey")
    .session(session ?? null)
    .lean();

  return new Set(
    activeEntries.map((entry) =>
      dedupePairKey(entry.recipient.toString(), entry.dedupeKey),
    ),
  );
};

const filterDuplicateRecipients = (recipients, activeDedupeKeys) => {
  const deliverable = [];
  let skippedDuplicate = 0;

  for (const recipient of recipients) {
    const key = dedupePairKey(recipient.userId, recipient.dedupeKey);

    if (activeDedupeKeys.has(key)) {
      skippedDuplicate += 1;
      continue;
    }

    deliverable.push(recipient);
    activeDedupeKeys.add(key);
  }

  return { deliverable, skippedDuplicate };
};

const claimDedupeSlots = async ({
  recipients,
  dedupeExpiresAt,
  session,
}) => {
  if (recipients.length === 0) {
    return { claimed: [], skippedDuplicate: 0 };
  }

  const bulkOps = recipients.map((recipient) => ({
    insertOne: {
      document: {
        recipient: recipient.userId,
        dedupeKey: recipient.dedupeKey,
        expiresAt: dedupeExpiresAt,
      },
    },
  }));

  try {
    await NotificationDedupe.bulkWrite(bulkOps, { ordered: false, session });
    return { claimed: recipients, skippedDuplicate: 0 };
  } catch (error) {
    const writeErrors = error.writeErrors ?? [];

    if (writeErrors.length === 0) throw error;

    const failedIndexes = new Set();

    for (const writeError of writeErrors) {
      if (writeError.code === DUPLICATE_KEY_ERROR_CODE) {
        failedIndexes.add(writeError.index);
        continue;
      }

      throw writeError;
    }

    const claimed = recipients.filter((_, index) => !failedIndexes.has(index));

    return {
      claimed,
      skippedDuplicate: recipients.length - claimed.length,
    };
  }
};

const insertNotifications = async ({ recipients, session }) => {
  const records = recipients.map((recipient) =>
    buildCreateNotificationRecord({
      recipient: recipient.userId,
      actor: recipient.notification.actor,
      type: recipient.notification.type,
      title: recipient.notification.title,
      message: recipient.notification.message,
      entityType: recipient.notification.entityType,
      entityId: recipient.notification.entityId,
      link: recipient.notification.link,
      metadata: recipient.notification.metadata,
      expiresAt: recipient.notification.expiresAt,
    }),
  );

  return Notification.insertMany(records, { ordered: false, session });
};

const attachNotificationIdsToDedupes = async ({
  recipients,
  notifications,
  session,
}) => {
  const bulkOps = notifications.map((notification, index) => ({
    updateOne: {
      filter: {
        recipient: recipients[index].userId,
        dedupeKey: recipients[index].dedupeKey,
      },
      update: {
        $set: {
          notificationId: notification._id,
        },
      },
    },
  }));

  if (bulkOps.length === 0) return;

  await NotificationDedupe.bulkWrite(bulkOps, { ordered: false, session });
};

const publishRealtimeHints = async ({
  notifications,
  publishRealtimeHint,
  logger,
}) => {
  if (!publishRealtimeHint || notifications.length === 0) {
    return { published: 0, failed: 0 };
  }

  let published = 0;
  let failed = 0;

  for (
    let index = 0;
    index < notifications.length;
    index += REALTIME_HINT_PUBLISH_CONCURRENCY
  ) {
    const slice = notifications.slice(
      index,
      index + REALTIME_HINT_PUBLISH_CONCURRENCY,
    );

    const results = await Promise.allSettled(
      slice.map((notification) =>
        publishRealtimeHint({
          userId: notification.recipient.toString(),
          notificationId: notification._id.toString(),
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        published += 1;
      } else {
        failed += 1;
        logger?.error?.(
          {
            err: result.reason,
            event: "deliver_notifications_realtime_hint_failed",
          },
          "Failed to publish notification realtime hint",
        );
      }
    }
  }

  return { published, failed };
};

const deliverRecipientBatch = async ({
  recipients,
  dedupeExpiresAt,
  publishRealtimeHint,
  session,
  logger,
}) => {
  await removeExpiredDedupeEntries(recipients, session);

  const activeDedupeKeys = await findActiveDedupeKeys(recipients, session);
  const { deliverable, skippedDuplicate: preClaimDuplicates } =
    filterDuplicateRecipients(recipients, activeDedupeKeys);

  if (deliverable.length === 0) {
    return {
      sent: 0,
      skippedDuplicate: preClaimDuplicates,
      notificationIds: [],
      realtimePublished: 0,
      realtimeFailed: 0,
    };
  }

  const { claimed, skippedDuplicate: claimDuplicates } = await claimDedupeSlots({
    recipients: deliverable,
    dedupeExpiresAt,
    session,
  });

  if (claimed.length === 0) {
    return {
      sent: 0,
      skippedDuplicate: preClaimDuplicates + claimDuplicates,
      notificationIds: [],
      realtimePublished: 0,
      realtimeFailed: 0,
    };
  }

  const notifications = await insertNotifications({
    recipients: claimed,
    session,
  });

  await attachNotificationIdsToDedupes({
    recipients: claimed,
    notifications,
    session,
  });

  const { published, failed } = await publishRealtimeHints({
    notifications,
    publishRealtimeHint,
    logger,
  });

  return {
    sent: notifications.length,
    skippedDuplicate: preClaimDuplicates + claimDuplicates,
    notificationIds: notifications.map((notification) => notification._id.toString()),
    realtimePublished: published,
    realtimeFailed: failed,
  };
};

export const deliverNotifications = async ({
  recipients = [],
  batchSize,
  dedupeWindowMs = DELIVER_NOTIFICATIONS_DEFAULT_DEDUPE_WINDOW_MS,
  emitRealtime = true,
  publishRealtimeHint = null,
  session = null,
  logger = null,
} = {}) => {
  const options = validateDeliverNotificationsOptions({
    recipients,
    batchSize,
    dedupeWindowMs,
    emitRealtime,
    publishRealtimeHint,
    session,
    logger,
  });

  const { normalized, skippedInvalid } = normalizeRecipients(
    recipients,
    options.logger,
  );

  if (normalized.length === 0) {
    return {
      requested: recipients.length,
      sent: 0,
      skippedDuplicate: 0,
      skippedInvalid,
      realtimePublished: 0,
      realtimeFailed: 0,
      notificationIds: [],
    };
  }

  const dedupeExpiresAt = new Date(Date.now() + dedupeWindowMs);
  const publishHint = options.emitRealtime ? options.publishRealtimeHint : null;

  let sent = 0;
  let skippedDuplicate = 0;
  let realtimePublished = 0;
  let realtimeFailed = 0;
  const notificationIds = [];

  for (let index = 0; index < normalized.length; index += options.batchSize) {
    const batch = normalized.slice(index, index + options.batchSize);
    const result = await deliverRecipientBatch({
      recipients: batch,
      dedupeExpiresAt,
      publishRealtimeHint: publishHint,
      session: options.session,
      logger: options.logger,
    });

    sent += result.sent;
    skippedDuplicate += result.skippedDuplicate;
    realtimePublished += result.realtimePublished;
    realtimeFailed += result.realtimeFailed;
    notificationIds.push(...result.notificationIds);
  }

  options.logger?.info?.(
    {
      event: "deliver_notifications_completed",
      requested: recipients.length,
      sent,
      skippedDuplicate,
      skippedInvalid,
      realtimePublished,
      realtimeFailed,
    },
    "Delivered notifications",
  );

  return {
    requested: recipients.length,
    sent,
    skippedDuplicate,
    skippedInvalid,
    realtimePublished,
    realtimeFailed,
    notificationIds,
  };
};
