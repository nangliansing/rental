import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import Notification from "../notification.model.js";
import { validateSearchNotificationsQuery } from "../notification.validation.js";

const notificationListProjection = {
  _id: 1,
  recipient: 1,
  actor: 1,
  type: 1,
  title: 1,
  message: 1,
  entityType: 1,
  entityId: 1,
  link: 1,
  metadata: 1,
  isRead: 1,
  readAt: 1,
  expiresAt: 1,
  createdAt: 1,
  updatedAt: 1,
};

export const getMyNotificationsService = async (
  queryInput,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const recipient = validateMongooseId(actorId, "recipient", {
    asObjectId: true,
  });
  const { isRead, page, limit } = validateSearchNotificationsQuery(queryInput);
  const skip = (page - 1) * limit;
  const now = new Date();
  const match = {
    recipient,
    expiresAt: { $gt: now },
  };

  if (isRead !== null) {
    match.isRead = isRead;
  }

  let notificationsQuery = Notification.find(match, notificationListProjection)
    .sort({ createdAt: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  let totalQuery = Notification.countDocuments(match);
  let unreadCountQuery = Notification.countDocuments({
    recipient,
    isRead: false,
    expiresAt: { $gt: now },
  });

  if (session) {
    notificationsQuery = notificationsQuery.session(session);
    totalQuery = totalQuery.session(session);
    unreadCountQuery = unreadCountQuery.session(session);
  }

  const [notifications, total, unreadCount] = await Promise.all([
    notificationsQuery,
    totalQuery,
    unreadCountQuery,
  ]);

  return {
    notifications,
    pagination: normalizePagination({ total }, page, limit),
    unreadCount,
  };
};
