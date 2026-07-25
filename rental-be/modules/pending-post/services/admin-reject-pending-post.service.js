import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
  validateObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import User from "../../user/user.model.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import { PENDING_POST_STATUSES } from "../pending-post.constants.js";
import { validatePendingPostReviewReason } from "../pending-post.validation.js";
import PendingPost from "../pending-post.model.js";

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function buildPendingPostRejectedNotification({
  pendingPost,
  reviewedBy,
  reason,
  existingBuilding,
}) {
  const pendingPostId = pendingPost._id.toString();
  const buildingName =
    pendingPost.building?.name || existingBuilding?.name || null;
  const rent = pendingPost.listing?.rent;
  const rentLabel =
    typeof rent === "number" && Number.isFinite(rent)
      ? `${rent.toLocaleString("en-US")} THB/month`
      : null;
  const listingLabel = [
    "your listing",
    rentLabel,
    buildingName ? `at ${buildingName}` : null,
  ]
    .filter(Boolean)
    .join(" ") || "your submitted listing";
  const messageListingLabel = truncateText(listingLabel, 180);
  const messageReason = truncateText(reason, 220);

  return {
    recipient: pendingPost.submittedBy,
    actor: reviewedBy,
    type: NOTIFICATION_TYPES.PENDING_LISTING_REJECTED,
    title: truncateText(`Listing not approved: ${listingLabel}`, 120),
    message: `Your listing "${messageListingLabel}" was not approved. Reason: ${messageReason}`,
    entityType: NOTIFICATION_ENTITY_TYPES.PENDING_LISTING,
    entityId: pendingPost._id,
    link: "/profile",
    metadata: {
      pendingPostId,
      existingBuildingId: pendingPost.existingBuildingId?.toString() ?? null,
      buildingName,
      listingLabel,
      reason,
    },
  };
}

async function getPendingPostForRejection(pendingPostId, session) {
  const pendingPost = await PendingPost.findOne({
    _id: pendingPostId,
    isDeleted: { $ne: true },
  }).session(session);

  if (!pendingPost) {
    throw new AppError("Pending post not found", 404, "PENDING_POST_NOT_FOUND");
  }

  if (pendingPost.status !== PENDING_POST_STATUSES.PENDING) {
    throw new AppError(
      "Pending post has already been reviewed",
      409,
      "PENDING_POST_ALREADY_REVIEWED",
    );
  }

  return pendingPost;
}

async function assertSubmittedUserExists(submittedBy, session) {
  const user = await User.findById(submittedBy).select("_id").session(session);

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
}

async function getExistingBuildingForNotification(pendingPost, session) {
  if (!pendingPost.existingBuildingId) return null;

  return Building.findById(pendingPost.existingBuildingId)
    .select("_id name")
    .session(session);
}

async function rejectPendingPost({
  pendingPostId,
  reviewedBy,
  reason,
  session,
}) {
  const pendingPost = await getPendingPostForRejection(pendingPostId, session);
  const submittedBy = validateMongooseId(
    pendingPost.submittedBy,
    "submittedBy",
  );

  await assertSubmittedUserExists(submittedBy, session);
  const existingBuilding = await getExistingBuildingForNotification(
    pendingPost,
    session,
  );

  const rejectedPendingPost = await PendingPost.findOneAndUpdate(
    {
      _id: pendingPost._id,
      status: PENDING_POST_STATUSES.PENDING,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        status: PENDING_POST_STATUSES.REJECTED,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reason,
        approvedBuildingId: null,
        approvedListingId: null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!rejectedPendingPost) {
    throw new AppError(
      "Pending post has already been reviewed",
      409,
      "PENDING_POST_ALREADY_REVIEWED",
    );
  }

  const notification = await createAndEmitNotification(
    buildPendingPostRejectedNotification({
      pendingPost,
      reviewedBy,
      reason,
      existingBuilding,
    }),
    { session, emit: false },
  );

  return {
    rejectedPendingPost,
    notification,
  };
}

export const adminRejectPendingPostService = async ({
  pendingPostId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");
  validateObject(body, "body");

  const validatedPendingPostId = validateMongooseId(
    pendingPostId,
    "pendingPostId",
    { asObjectId: true },
  );
  const reviewedBy = validateMongooseId(actorId, "reviewedBy");
  const reason = validatePendingPostReviewReason(body.reason);

  const rejectInSession = async (activeSession) => {
    return rejectPendingPost({
      pendingPostId: validatedPendingPostId,
      reviewedBy,
      reason,
      session: activeSession,
    });
  };

  if (session?.inTransaction?.()) {
    const { rejectedPendingPost } = await rejectInSession(session);

    return rejectedPendingPost;
  }

  if (session) {
    let rejectedPendingPost;
    let notification;

    await session.withTransaction(async () => {
      const result = await rejectInSession(session);
      rejectedPendingPost = result.rejectedPendingPost;
      notification = result.notification;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return rejectedPendingPost;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let rejectedPendingPost;
    let notification;

    await transactionSession.withTransaction(async () => {
      const result = await rejectInSession(transactionSession);

      rejectedPendingPost = result.rejectedPendingPost;
      notification = result.notification;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return rejectedPendingPost;
  } finally {
    await transactionSession.endSession();
  }
};
