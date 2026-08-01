import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
  validateObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import { buildCreateBuildingRecord } from "../../building/mappers/index.js";
import { adminCreateListingService } from "../../listing/services/index.js";
import {
  maybeEnqueueBuildingFollowerNewListing,
  maybeEnqueueBuildingFollowerPriceDrop,
} from "../../building-follow-notify/services/enqueue-building-followers-notify.service.js";
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

function toPlainObject(document) {
  if (!document) return null;

  return typeof document.toObject === "function"
    ? document.toObject()
    : document;
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function buildPendingPostApprovedNotification({
  pendingPost,
  reviewedBy,
  listing,
  building,
  reason,
}) {
  const buildingName =
    building?.name || pendingPost.building?.name || "your listing";
  const rent = pendingPost.listing?.rent;
  const listingLabel =
    typeof rent === "number" && Number.isFinite(rent)
      ? `${buildingName} (${rent.toLocaleString("en-US")} THB/month)`
      : buildingName;
  const messageListingLabel = truncateText(listingLabel, 180);
  const messageReason = truncateText(reason, 220);

  return {
    recipient: pendingPost.submittedBy,
    actor: reviewedBy,
    type: NOTIFICATION_TYPES.PENDING_LISTING_APPROVED,
    title: truncateText(`Listing approved: ${buildingName}`, 120),
    message: `Your listing "${messageListingLabel}" has been approved and is now visible to renters. Reason: ${messageReason}`,
    entityType: NOTIFICATION_ENTITY_TYPES.LISTING,
    entityId: listing._id,
    link: `/listings/${listing._id.toString()}`,
    metadata: {
      pendingPostId: pendingPost._id.toString(),
      listingId: listing._id.toString(),
      buildingId: building._id.toString(),
      buildingName,
      listingLabel,
      reason,
    },
  };
}

async function getPendingPostForApproval(pendingPostId, session) {
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

async function getApprovedBuilding(
  pendingPost,
  submittedBy,
  reviewedBy,
  session,
) {
  if (pendingPost.existingBuildingId) {
    const building = await Building.findById(
      pendingPost.existingBuildingId,
    ).session(session);

    if (!building) {
      throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
    }

    if (building.isActive === false) {
      throw new AppError("Building is inactive", 422, "BUILDING_INACTIVE");
    }

    return building;
  }

  const buildingSnapshot = toPlainObject(pendingPost.building);

  if (!buildingSnapshot) {
    throw new AppError(
      "Pending post building is required",
      422,
      "VALIDATION_ERROR",
    );
  }

  const buildingRecord = {
    ...buildCreateBuildingRecord(buildingSnapshot, submittedBy),
    updatedBy: reviewedBy,
  };

  const [building] = await Building.create([buildingRecord], { session });

  return building;
}

async function approvePendingPost({
  pendingPostId,
  reviewedBy,
  reason,
  session,
}) {
  const pendingPost = await getPendingPostForApproval(pendingPostId, session);
  const submittedBy = validateMongooseId(
    pendingPost.submittedBy,
    "submittedBy",
  );

  await assertSubmittedUserExists(submittedBy, session);

  const approvedBuilding = await getApprovedBuilding(
    pendingPost,
    submittedBy,
    reviewedBy,
    session,
  );

  const listingSnapshot = toPlainObject(pendingPost.listing);
  const previousMinRent = approvedBuilding.minRent ?? null;

  const listing = await adminCreateListingService(
    {
      ...listingSnapshot,
      buildingId: approvedBuilding._id,
    },
    submittedBy,
    session,
  );

  const currentMinRent =
    (await Building.findById(approvedBuilding._id)
      .select("minRent name")
      .session(session)
      .lean())?.minRent ?? null;

  const approvedPendingPost = await PendingPost.findOneAndUpdate(
    {
      _id: pendingPost._id,
      status: PENDING_POST_STATUSES.PENDING,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        status: PENDING_POST_STATUSES.APPROVED,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reason,
        approvedBuildingId: approvedBuilding._id,
        approvedListingId: listing._id,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!approvedPendingPost) {
    throw new AppError(
      "Pending post has already been reviewed",
      409,
      "PENDING_POST_ALREADY_REVIEWED",
    );
  }

  const notification = await createAndEmitNotification(
    buildPendingPostApprovedNotification({
      pendingPost,
      reviewedBy,
      listing,
      building: approvedBuilding,
      reason,
    }),
    { session, emit: false },
  );

  return {
    approvedPendingPost,
    notification,
    followerSideEffects: {
      building: approvedBuilding,
      listing,
      previousMinRent,
      currentMinRent,
    },
  };
}

async function runApproveFollowerSideEffects(followerSideEffects, { logger } = {}) {
  if (!followerSideEffects) return;

  const { building, listing, previousMinRent, currentMinRent } =
    followerSideEffects;

  await maybeEnqueueBuildingFollowerNewListing({
    listing,
    buildingId: building._id,
    buildingName: building.name,
    occurredAt: new Date(),
    logger,
  });

  await maybeEnqueueBuildingFollowerPriceDrop({
    buildingId: building._id,
    buildingName: building.name,
    oldMinRent: previousMinRent,
    newMinRent: currentMinRent,
    occurredAt: new Date(),
    logger,
  });
}

export const adminApprovePendingPostService = async ({
  pendingPostId,
  actorId,
  body,
  session = null,
  logger = null,
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

  const approveInSession = async (activeSession) => {
    return approvePendingPost({
      pendingPostId: validatedPendingPostId,
      reviewedBy,
      reason,
      session: activeSession,
    });
  };

  if (session?.inTransaction?.()) {
    const { approvedPendingPost } = await approveInSession(session);

    return approvedPendingPost;
  }

  if (session) {
    let approvedPendingPost;
    let notification;
    let followerSideEffects;

    await session.withTransaction(async () => {
      const result = await approveInSession(session);
      approvedPendingPost = result.approvedPendingPost;
      notification = result.notification;
      followerSideEffects = result.followerSideEffects;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    await runApproveFollowerSideEffects(followerSideEffects, { logger });

    return approvedPendingPost;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let approvedPendingPost;
    let notification;
    let followerSideEffects;

    await transactionSession.withTransaction(async () => {
      const result = await approveInSession(transactionSession);

      approvedPendingPost = result.approvedPendingPost;
      notification = result.notification;
      followerSideEffects = result.followerSideEffects;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    await runApproveFollowerSideEffects(followerSideEffects, { logger });

    return approvedPendingPost;
  } finally {
    await transactionSession.endSession();
  }
};
