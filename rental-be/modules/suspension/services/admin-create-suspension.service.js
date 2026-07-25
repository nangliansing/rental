import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import User from "../../user/user.model.js";
import { USER_ROLES, USER_STATUSES } from "../../user/user.constants.js";

import Suspension from "../suspension.model.js";
import { SUSPENSION_STATUSES } from "../suspension.constants.js";
import { validateCreateSuspensionBody } from "../suspension.validation.js";

const formatSuspensionDate = (date) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

const PLATFORM_ADMIN_ROLES = new Set([USER_ROLES.OWNER, USER_ROLES.ADMIN]);

const isPlatformAdminRole = (role) => PLATFORM_ADMIN_ROLES.has(role);

const buildUserSuspendedNotification = ({
  suspension,
  createdBy,
}) => ({
  recipient: suspension.userId,
  actor: createdBy,
  type: NOTIFICATION_TYPES.USER_SUSPENDED,
  title: "Account restricted",
  message: `Your account is restricted until ${formatSuspensionDate(suspension.expiresAt)}. Reason: ${suspension.reason}`,
  entityType: NOTIFICATION_ENTITY_TYPES.SUSPENSION,
  entityId: suspension._id,
  link: "/profile",
  metadata: {
    suspensionId: suspension._id.toString(),
    reason: suspension.reason,
    expiresAt: suspension.expiresAt.toISOString(),
  },
});

const findActiveSuspension = ({ userId, now, session }) => {
  return Suspension.findOne({
    userId,
    status: SUSPENSION_STATUSES.ACTIVE,
    expiresAt: { $gt: now },
  }).session(session);
};

const suspendUser = ({ userId, session }) => {
  return User.findOneAndUpdate(
    {
      _id: userId,
      role: { $nin: [USER_ROLES.OWNER, USER_ROLES.ADMIN] },
    },
    { $set: { status: USER_STATUSES.SUSPENDED } },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );
};

async function createSuspension({
  body,
  createdBy,
  session,
}) {
  const now = new Date();
  const record = validateCreateSuspensionBody(body, { now });

  if (record.userId.toString() === createdBy.toString()) {
    throw new AppError(
      "You cannot suspend your own account",
      422,
      "CANNOT_SUSPEND_SELF",
    );
  }

  const user = await User.findById(record.userId).session(session);

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (isPlatformAdminRole(user.role)) {
    throw new AppError(
      "Admins and owners cannot be suspended",
      403,
      "CANNOT_SUSPEND_PLATFORM_ADMIN",
    );
  }

  const activeSuspension = await findActiveSuspension({
    userId: user._id,
    now,
    session,
  });

  if (activeSuspension) {
    throw new AppError(
      "User already has an active suspension",
      409,
      "ACTIVE_SUSPENSION_EXISTS",
    );
  }

  const suspendedUser = await suspendUser({
    userId: user._id,
    session,
  });

  if (!suspendedUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const [suspension] = await Suspension.create(
    [
      {
        ...record,
        status: SUSPENSION_STATUSES.ACTIVE,
        createdBy,
        liftedBy: null,
        liftedAt: null,
        liftReason: null,
      },
    ],
    { session },
  );

  const notification = await createAndEmitNotification(
    buildUserSuspendedNotification({
      suspension,
      createdBy,
    }),
    { session, emit: false },
  );

  return {
    suspension,
    user: suspendedUser,
    notification,
  };
}

const emitSuspensionNotification = (notification) => {
  if (!notification) return;

  emitNotificationToUser(notification.recipient.toString(), notification);
};

const toCreateSuspensionResult = ({ suspension, user }) => ({
  suspension,
  user,
});

export const adminCreateSuspensionService = async ({
  body,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const createdBy = validateMongooseId(actorId, "createdBy", {
    asObjectId: true,
  });

  if (session) {
    const result = await createSuspension({
      body,
      createdBy,
      session,
    });

    if (!session.inTransaction?.()) {
      emitSuspensionNotification(result.notification);
    }

    return toCreateSuspensionResult(result);
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await createSuspension({
        body,
        createdBy,
        session: transactionSession,
      });
    });

    emitSuspensionNotification(result.notification);

    return toCreateSuspensionResult(result);
  } finally {
    await transactionSession.endSession();
  }
};
