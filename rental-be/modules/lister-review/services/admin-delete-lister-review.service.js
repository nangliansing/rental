import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/app-error.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import User from "../../user/user.model.js";
import ListerReview from "../lister-review.model.js";
import {
  validateAdminDeleteListerReviewBody,
  validateListerReviewId,
} from "../lister-review.validation.js";
import { recalculateListerReviewSummaryService } from "./recalculate-lister-review-summary.service.js";

const NOTIFICATION_MESSAGE_PREFIX =
  "Your review was removed after moderation. Reason: ";
const NOTIFICATION_MESSAGE_MAX_LENGTH = 500;

const buildNotificationMessage = (removeReason) => {
  const availableReasonLength =
    NOTIFICATION_MESSAGE_MAX_LENGTH - NOTIFICATION_MESSAGE_PREFIX.length;

  if (removeReason.length <= availableReasonLength) {
    return `${NOTIFICATION_MESSAGE_PREFIX}${removeReason}`;
  }

  const truncatedReason = removeReason
    .slice(0, availableReasonLength - 3)
    .trimEnd();

  return `${NOTIFICATION_MESSAGE_PREFIX}${truncatedReason}...`;
};

const buildAdminRemovedReviewNotification = ({
  review,
  removedBy,
  removeReason,
}) => {
  return {
    recipient: review.reviewerId,
    actor: removedBy,
    type: NOTIFICATION_TYPES.REVIEW_REMOVED,
    title: "Review removed",
    message: buildNotificationMessage(removeReason),
    entityType: NOTIFICATION_ENTITY_TYPES.REVIEW,
    entityId: review._id,
    link: null,
    metadata: {
      reviewId: review._id.toString(),
      reviewerId: review.reviewerId.toString(),
      listerProfileId: review.listerProfileId.toString(),
      reason: removeReason,
    },
  };
};

const deleteListerReviewAsAdmin = async ({
  reviewId,
  removedBy,
  removeReason,
  session,
}) => {
  const now = new Date();
  const deletedReview = await ListerReview.findOneAndUpdate(
    {
      _id: reviewId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: now,
        "moderation.removedBy": removedBy,
        "moderation.removedAt": now,
        "moderation.removedReason": removeReason,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!deletedReview) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  const reviewSummary = await recalculateListerReviewSummaryService({
    listerProfileId: deletedReview.listerProfileId,
    session,
  });

  const reviewerExists = await User.exists({
    _id: deletedReview.reviewerId,
  }).session(session);
  const notification = reviewerExists
    ? await createAndEmitNotification(
        buildAdminRemovedReviewNotification({
          review: deletedReview,
          removedBy,
          removeReason,
        }),
        { session, emit: false },
      )
    : null;

  return {
    review: deletedReview,
    reviewSummary,
    notification,
  };
};

export const adminDeleteListerReviewService = async ({
  reviewId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedReviewId = validateListerReviewId(reviewId);
  const removedBy = validateMongooseId(actorId, "removedBy");
  const { reason: removeReason } = validateAdminDeleteListerReviewBody(body);

  if (session) {
    const { review, reviewSummary, notification } =
      await deleteListerReviewAsAdmin({
        reviewId: validatedReviewId,
        removedBy,
        removeReason,
        session,
      });

    if (notification && !session.inTransaction?.()) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return { review, reviewSummary };
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await deleteListerReviewAsAdmin({
        reviewId: validatedReviewId,
        removedBy,
        removeReason,
        session: transactionSession,
      });
    });

    if (result?.notification) {
      emitNotificationToUser(
        result.notification.recipient.toString(),
        result.notification,
      );
    }

    return {
      review: result.review,
      reviewSummary: result.reviewSummary,
    };
  } finally {
    await transactionSession.endSession();
  }
};
