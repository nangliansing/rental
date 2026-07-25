import { SOCKET_EVENTS } from "./socket.constants.js";
import { emitToUser } from "./socket-server.js";

const serializeNotification = (notification) => {
  if (!notification) return notification;

  if (typeof notification.toObject === "function") {
    return notification.toObject();
  }

  return notification;
};

export const emitNotificationToUser = (userId, notification) => {
  return emitToUser(
    userId,
    SOCKET_EVENTS.NOTIFICATION_NEW,
    serializeNotification(notification),
  );
};
