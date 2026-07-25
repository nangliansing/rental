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
import {
  validateLiftSuspensionBody,
  validateSuspensionId,
} from "../suspension.validation.js";
import { buildAdminSuspensionDetailPipeline } from "../utils/admin-suspension-aggregation.js";

const buildSuspensionLiftedNotification = ({
  suspension,
  liftedBy,
  liftReason,
}) => ({
  recipient: suspension.userId,
  actor: liftedBy,
  type: NOTIFICATION_TYPES.SUSPENSION_LIFTED,
  title: "Suspension lifted",
  message: `Your account restriction has been lifted. You can use your account again. Reason: ${liftReason}`,
  entityType: NOTIFICATION_ENTITY_TYPES.SUSPENSION,
  entityId: suspension._id,
  link: "/profile",
  metadata: {
    suspensionId: suspension._id.toString(),
    reason: liftReason,
  },
});

const findActiveSuspension = ({ userId, excludeSuspensionId, now, session }) => {
  return Suspension.findOne({
    _id: { $ne: excludeSuspensionId },
    userId,
    status: SUSPENSION_STATUSES.ACTIVE,
    expiresAt: { $gt: now },
  }).session(session);
};

const restoreUserIfNoActiveSuspension = async ({
  userId,
  liftedSuspensionId,
  now,
  session,
}) => {
  const remainingActiveSuspension = await findActiveSuspension({
    userId,
    excludeSuspensionId: liftedSuspensionId,
    now,
    session,
  });

  if (remainingActiveSuspension) {
    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      role: { $nin: [USER_ROLES.OWNER, USER_ROLES.ADMIN] },
    },
    {
      $set: {
        status: USER_STATUSES.ACTIVE,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
};

const getEnrichedSuspensionById = async ({ suspensionId, session }) => {
  const [suspension] = await Suspension.aggregate(
    buildAdminSuspensionDetailPipeline(suspensionId),
  ).session(session);

  if (!suspension) {
    throw new AppError(
      "Suspension not found",
      404,
      "SUSPENSION_NOT_FOUND",
    );
  }

  return suspension;
};

async function liftSuspension({
  suspensionId,
  body,
  liftedBy,
  session,
}) {
  const record = validateLiftSuspensionBody(body);
  const now = new Date();

  const suspension = await Suspension.findById(suspensionId).session(session);

  if (!suspension) {
    throw new AppError(
      "Suspension not found",
      404,
      "SUSPENSION_NOT_FOUND",
    );
  }

  if (suspension.status === SUSPENSION_STATUSES.LIFTED) {
    throw new AppError(
      "Suspension is already lifted",
      409,
      "SUSPENSION_ALREADY_LIFTED",
    );
  }

  if (
    suspension.status !== SUSPENSION_STATUSES.ACTIVE ||
    suspension.expiresAt <= now
  ) {
    throw new AppError(
      "Only active suspensions can be lifted",
      409,
      "SUSPENSION_NOT_ACTIVE",
    );
  }

  const liftedSuspension = await Suspension.findOneAndUpdate(
    {
      _id: suspension._id,
      status: SUSPENSION_STATUSES.ACTIVE,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: SUSPENSION_STATUSES.LIFTED,
        liftedBy,
        liftedAt: now,
        liftReason: record.liftReason,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!liftedSuspension) {
    throw new AppError(
      "Only active suspensions can be lifted",
      409,
      "SUSPENSION_NOT_ACTIVE",
    );
  }

  const user = await restoreUserIfNoActiveSuspension({
    userId: suspension.userId,
    liftedSuspensionId: suspension._id,
    now,
    session,
  });

  const enrichedSuspension = await getEnrichedSuspensionById({
    suspensionId: liftedSuspension._id,
    session,
  });

  const notification = await createAndEmitNotification(
    buildSuspensionLiftedNotification({
      suspension: liftedSuspension,
      liftedBy,
      liftReason: record.liftReason,
    }),
    { session, emit: false },
  );

  return {
    suspension: enrichedSuspension,
    user,
    notification,
  };
}

const emitLiftNotification = (notification) => {
  if (!notification) return;

  emitNotificationToUser(notification.recipient.toString(), notification);
};

const toLiftSuspensionResult = ({ suspension, user }) => ({
  suspension,
  user,
});

export const adminLiftSuspensionService = async ({
  suspensionId: suspensionIdInput,
  body,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const suspensionId = validateSuspensionId(suspensionIdInput);
  const liftedBy = validateMongooseId(actorId, "liftedBy", {
    asObjectId: true,
  });

  if (session) {
    const result = await liftSuspension({
      suspensionId,
      body,
      liftedBy,
      session,
    });

    if (!session.inTransaction?.()) {
      emitLiftNotification(result.notification);
    }

    return toLiftSuspensionResult(result);
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await liftSuspension({
        suspensionId,
        body,
        liftedBy,
        session: transactionSession,
      });
    });

    emitLiftNotification(result.notification);

    return toLiftSuspensionResult(result);
  } finally {
    await transactionSession.endSession();
  }
};
