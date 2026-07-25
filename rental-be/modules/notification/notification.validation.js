import { AppError } from "../../shared/errors/app-error.js";
import {
  validateBoolean,
  validateEnumValue,
  validateLimit,
  validateMongooseId,
  validateNullableObject,
  validateObject,
  validateOptionalString,
  validatePage,
  validateRequiredString,
} from "../../shared/validators/index.js";
import {
  NOTIFICATION_DEFAULT_TTL_DAYS,
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "./notification.constants.js";

const millisecondsInDay = 24 * 60 * 60 * 1000;

const validateDate = (input, fieldName, { required = true } = {}) => {
  if (input == null) {
    if (!required) return null;

    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      `${fieldName} must be a valid date`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return date;
};

const validateNotificationLink = (input) => {
  const link = validateOptionalString(input, "link", 500);

  if (!link) return null;

  if (!link.startsWith("/")) {
    throw new AppError("link must be an internal path", 422, "VALIDATION_ERROR");
  }

  if (link.startsWith("//")) {
    throw new AppError("link must be an internal path", 422, "VALIDATION_ERROR");
  }

  return link;
};

const validateNotificationMetadata = (input) => {
  const metadata = validateNullableObject(input, "metadata");

  return metadata ?? {};
};

const validateOptionalQueryBoolean = (input, fieldName) => {
  if (input == null || input === "") return null;

  if (typeof input === "boolean") return input;

  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  throw new AppError(`${fieldName} must be a boolean`, 422, "VALIDATION_ERROR");
};

export const getDefaultNotificationExpiresAt = () => {
  return new Date(Date.now() + NOTIFICATION_DEFAULT_TTL_DAYS * millisecondsInDay);
};

export const validateNotificationId = (input) => {
  return validateMongooseId(input, "notificationId", {
    asObjectId: true,
  });
};

export const validateCreateNotificationPayload = (input) => {
  validateObject(input, "notification");

  const entityType = validateEnumValue(
    input.entityType ?? NOTIFICATION_ENTITY_TYPES.SYSTEM,
    "entityType",
    Object.values(NOTIFICATION_ENTITY_TYPES),
  );
  const entityId =
    input.entityId == null
      ? null
      : validateMongooseId(input.entityId, "entityId", { asObjectId: true });
  const expiresAt =
    validateDate(input.expiresAt, "expiresAt", { required: false }) ??
    getDefaultNotificationExpiresAt();

  if (expiresAt <= new Date()) {
    throw new AppError(
      "expiresAt must be in the future",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (entityType === NOTIFICATION_ENTITY_TYPES.SYSTEM && entityId) {
    throw new AppError(
      "entityId is not allowed for system notifications",
      422,
      "VALIDATION_ERROR",
    );
  }

  if (entityType !== NOTIFICATION_ENTITY_TYPES.SYSTEM && !entityId) {
    throw new AppError(
      "entityId is required for entity notifications",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    recipient: validateMongooseId(input.recipient, "recipient", {
      asObjectId: true,
    }),
    actor:
      input.actor == null
        ? null
        : validateMongooseId(input.actor, "actor", { asObjectId: true }),
    type: validateEnumValue(
      input.type,
      "type",
      Object.values(NOTIFICATION_TYPES),
    ),
    title: validateRequiredString(input.title, "title", 120),
    message: validateRequiredString(input.message, "message", 500),
    entityType,
    entityId,
    link: validateNotificationLink(input.link),
    metadata: validateNotificationMetadata(input.metadata),
    expiresAt,
  };
};

export const validateSearchNotificationsQuery = (input) => {
  validateObject(input, "query");

  return {
    isRead: validateOptionalQueryBoolean(input.isRead, "isRead"),
    page: validatePage(input.page),
    limit: validateLimit(input.limit),
  };
};

export const validateUpdateNotificationReadBody = (input) => {
  validateObject(input, "body");

  return {
    isRead: validateBoolean(input.isRead, "isRead"),
  };
};
