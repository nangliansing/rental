import { validateCreateNotificationPayload } from "../notification.validation.js";

export const buildCreateNotificationRecord = (payload) => {
  const {
    recipient,
    actor,
    type,
    title,
    message,
    entityType,
    entityId,
    link,
    metadata,
    expiresAt,
  } = validateCreateNotificationPayload(payload);

  return {
    recipient,
    actor,
    type,
    title,
    message,
    entityType,
    entityId,
    link,
    metadata,
    isRead: false,
    readAt: null,
    expiresAt,
  };
};
