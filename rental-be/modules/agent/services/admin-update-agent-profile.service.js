// modules/agent/services/admin-update-agent-profile.service.js
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

import { buildAdminUpdateAgentProfileRecord } from "../mappers/index.js";
import AgentProfile from "../agent-profile.model.js";
import User from "../../user/user.model.js";

const throwAgentProfileNotFound = () => {
  throw new AppError(
    "Agent profile not found",
    404,
    "AGENT_PROFILE_NOT_FOUND"
  );
};

const throwNoModerationChanges = () => {
  throw new AppError(
    "No moderation changes provided",
    422,
    "VALIDATION_ERROR"
  );
};

const buildAgentProfileModerationNotification = ({
  agentProfile,
  actorId,
  isVerified,
  reason,
}) => {
  const type = isVerified
    ? NOTIFICATION_TYPES.AGENT_PROFILE_VERIFIED
    : NOTIFICATION_TYPES.AGENT_PROFILE_UNVERIFIED;

  return {
    recipient: agentProfile.userId,
    actor: actorId,
    type,
    title: isVerified ? "Agent profile verified" : "Agent profile verification removed",
    message: isVerified
      ? `Your agent profile has been verified. Reason: ${reason}`
      : `Your agent profile verification has been removed. Reason: ${reason}`,
    entityType: NOTIFICATION_ENTITY_TYPES.AGENT_PROFILE,
    entityId: agentProfile._id,
    link: "/profile",
    metadata: {
      agentProfileId: agentProfile._id.toString(),
      isVerified,
      reason,
    },
  };
};

const emitAgentProfileNotification = (notification) => {
  if (!notification) return;

  emitNotificationToUser(notification.recipient.toString(), notification);
};

const updateAgentProfileModeration = async ({
  agentProfileId,
  body,
  actorId,
  session,
}) => {
  const { update, reason } = buildAdminUpdateAgentProfileRecord(body, actorId);

  const existingAgentProfile = await AgentProfile.findOne({
    _id: agentProfileId,
    isDeleted: false,
  }).session(session);

  if (!existingAgentProfile) {
    throwAgentProfileNotFound();
  }

  const profileUser = await User.findById(existingAgentProfile.userId).session(
    session
  );

  if (!profileUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (existingAgentProfile.isVerified === update.isVerified) {
    throwNoModerationChanges();
  }

  const agentProfile = await AgentProfile.findOneAndUpdate(
    {
      _id: existingAgentProfile._id,
      isDeleted: false,
    },
    { $set: update },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    }
  );

  if (!agentProfile) {
    throwAgentProfileNotFound();
  }

  const notification = await createAndEmitNotification(
    buildAgentProfileModerationNotification({
      agentProfile,
      actorId,
      isVerified: update.isVerified,
      reason,
    }),
    { session, emit: false }
  );

  return {
    agentProfile,
    notification,
  };
};

export const adminUpdateAgentProfileService = async (
  agentProfileId,
  body,
  actorId,
  session = null
) => {
  validateNullableObject(session, "session");

  const validatedAgentProfileId = validateMongooseId(
    agentProfileId,
    "agentProfileId",
    { asObjectId: true }
  );

  const validatedActorId = validateMongooseId(actorId, "actorId", {
    asObjectId: true,
  });

  if (session) {
    const result = await updateAgentProfileModeration({
      agentProfileId: validatedAgentProfileId,
      body,
      actorId: validatedActorId,
      session,
    });

    if (!session.inTransaction?.()) {
      emitAgentProfileNotification(result.notification);
    }

    return result.agentProfile;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await updateAgentProfileModeration({
        agentProfileId: validatedAgentProfileId,
        body,
        actorId: validatedActorId,
        session: transactionSession,
      });
    });

    emitAgentProfileNotification(result.notification);

    return result.agentProfile;
  } finally {
    await transactionSession.endSession();
  }
};
