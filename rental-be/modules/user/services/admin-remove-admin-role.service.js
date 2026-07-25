import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";

import User from "../user.model.js";
import { USER_ROLES } from "../user.constants.js";
import { validateUserId } from "../user.validation.js";
import { buildAdminUserProjection } from "../utils/index.js";

const buildAdminRoleRemovedNotification = ({ user, removedBy }) => ({
  recipient: user._id,
  actor: removedBy,
  type: NOTIFICATION_TYPES.ADMIN_ROLE_REMOVED,
  title: "Admin access removed",
  message: "Your admin access was removed. You can still use your account.",
  entityType: NOTIFICATION_ENTITY_TYPES.USER,
  entityId: user._id,
  link: "/profile",
  metadata: {
    userId: user._id.toString(),
    removedRole: USER_ROLES.ADMIN,
    newRole: USER_ROLES.USER,
  },
});

const removeAdminRole = async ({ userId, removedBy, session }) => {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      role: USER_ROLES.ADMIN,
    },
    {
      $set: {
        role: USER_ROLES.USER,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      projection: buildAdminUserProjection(),
    }
  ).session(session);

  if (!user) {
    throw new AppError(
      "User not found or is not an admin",
      404,
      "ADMIN_USER_NOT_FOUND"
    );
  }

  const notification = await createAndEmitNotification(
    buildAdminRoleRemovedNotification({ user, removedBy }),
    { session, emit: false }
  );

  return {
    user,
    notification,
  };
};

export const adminRemoveAdminRoleService = async ({
  userId: userIdInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateUserId(userIdInput);
  const removedBy = validateMongooseId(actorId, "removedBy", {
    asObjectId: true,
  });

  if (session) {
    const result = await removeAdminRole({
      userId,
      removedBy,
      session,
    });

    if (!session.inTransaction?.()) {
      emitNotificationToUser(
        result.notification.recipient.toString(),
        result.notification
      );
    }

    return result.user;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await removeAdminRole({
        userId,
        removedBy,
        session: transactionSession,
      });
    });

    emitNotificationToUser(
      result.notification.recipient.toString(),
      result.notification
    );

    return result.user;
  } finally {
    await transactionSession.endSession();
  }
};
