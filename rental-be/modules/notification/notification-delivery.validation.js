import { AppError } from "../../shared/errors/app-error.js";
import {
  validateMongooseId,
  validateObject,
  validateRequiredString,
} from "../../shared/validators/index.js";
import {
  DEDUPE_KEY_MAX_LENGTH,
  DEDUPE_KEY_PATTERN,
  DELIVER_NOTIFICATIONS_BATCH_SIZE,
  DELIVER_NOTIFICATIONS_MAX_RECIPIENTS,
} from "./notification-delivery.constants.js";
import { validateCreateNotificationPayload } from "./notification.validation.js";

const validateDedupeKey = (input) => {
  const dedupeKey = validateRequiredString(input, "dedupeKey", DEDUPE_KEY_MAX_LENGTH);

  if (!DEDUPE_KEY_PATTERN.test(dedupeKey)) {
    throw new AppError(
      "dedupeKey must use letters, numbers, dots, underscores, or hyphens",
      422,
      "VALIDATION_ERROR",
    );
  }

  return dedupeKey;
};

export const validateDeliverNotificationRecipient = (input) => {
  validateObject(input, "recipient");

  const userId = validateMongooseId(input.userId, "userId", {
    asObjectId: true,
  });
  const dedupeKey = validateDedupeKey(input.dedupeKey);
  const notification = validateCreateNotificationPayload({
    ...input.notification,
    recipient: userId,
  });

  return {
    userId,
    dedupeKey,
    notification,
  };
};

export const validateDeliverNotificationsOptions = (input) => {
  validateObject(input, "options");

  if (!Array.isArray(input.recipients)) {
    throw new AppError("recipients must be an array", 422, "VALIDATION_ERROR");
  }

  if (input.recipients.length > DELIVER_NOTIFICATIONS_MAX_RECIPIENTS) {
    throw new AppError(
      `recipients must contain at most ${DELIVER_NOTIFICATIONS_MAX_RECIPIENTS} entries`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const batchSize =
    input.batchSize == null
      ? DELIVER_NOTIFICATIONS_BATCH_SIZE
      : Number(input.batchSize);

  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > DELIVER_NOTIFICATIONS_BATCH_SIZE
  ) {
    throw new AppError(
      `batchSize must be an integer from 1 through ${DELIVER_NOTIFICATIONS_BATCH_SIZE}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const dedupeWindowMs =
    input.dedupeWindowMs == null
      ? undefined
      : Number(input.dedupeWindowMs);

  if (
    dedupeWindowMs !== undefined &&
    (!Number.isInteger(dedupeWindowMs) ||
      dedupeWindowMs < 60_000 ||
      dedupeWindowMs > 7 * 24 * 60 * 60 * 1000)
  ) {
    throw new AppError(
      "dedupeWindowMs must be an integer between 60000 and 604800000",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (
    input.emitRealtime != null &&
    typeof input.emitRealtime !== "boolean"
  ) {
    throw new AppError("emitRealtime must be a boolean", 422, "VALIDATION_ERROR");
  }

  if (
    input.publishRealtimeHint != null &&
    typeof input.publishRealtimeHint !== "function"
  ) {
    throw new AppError(
      "publishRealtimeHint must be a function",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    batchSize,
    dedupeWindowMs,
    emitRealtime: input.emitRealtime ?? true,
    publishRealtimeHint: input.publishRealtimeHint ?? null,
    session: input.session ?? null,
    logger: input.logger ?? null,
  };
};
