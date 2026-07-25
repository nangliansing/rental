import { validateNullableObject } from "../../../shared/validators/index.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import { buildCreateNotificationRecord } from "../mappers/index.js";
import Notification from "../notification.model.js";

export const createNotification = async (payload, session = null) => {
  validateNullableObject(session, "session");

  const record = buildCreateNotificationRecord(payload);
  const createOptions = session ? { session } : undefined;
  const [notification] = await Notification.create([record], createOptions);

  return notification;
};

export const createAndEmitNotification = async (
  payload,
  { session = null, emit = true } = {},
) => {
  validateNullableObject(session, "session");

  const notification = await createNotification(payload, session);

  if (emit) {
    emitNotificationToUser(notification.recipient.toString(), notification);
  }

  return notification;
};
