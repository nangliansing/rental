import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import AgentProfile from "../../agent/agent-profile.model.js";

import ListerReview from "../lister-review.model.js";
import { validateListerReviewId } from "../lister-review.validation.js";

const buildVisibilityUpdate = ({ isCurrentlyCollapsed, actorId }) => {
  if (isCurrentlyCollapsed) {
    return {
      "visibility.isCollapsed": false,
      "visibility.collapsedBy": null,
      "visibility.collapsedAt": null,
      "visibility.collapseReason": null,
    };
  }

  return {
    "visibility.isCollapsed": true,
    "visibility.collapsedBy": actorId,
    "visibility.collapsedAt": new Date(),
    "visibility.collapseReason": null,
  };
};

const toggleListerReviewCollapse = async ({ reviewId, actorId, session }) => {
  const listerUserId = validateMongooseId(actorId, "listerUserId", {
    asObjectId: true,
  });
  const validatedReviewId = validateListerReviewId(reviewId);

  const reviewQuery = ListerReview.findOne({
    _id: validatedReviewId,
    isDeleted: { $ne: true },
  }).select("_id listerProfileId visibility");

  if (session) {
    reviewQuery.session(session);
  }

  const review = await reviewQuery;

  if (!review) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  const listerProfileQuery = AgentProfile.findOne({
    _id: review.listerProfileId,
    userId: listerUserId,
    isDeleted: { $ne: true },
  }).select("_id userId isDeleted isOnline");

  if (session) {
    listerProfileQuery.session(session);
  }

  const listerProfile = await listerProfileQuery;

  if (!listerProfile) {
    throw new AppError(
      "You can only collapse reviews on your own profile",
      403,
      "LISTER_REVIEW_OWNER_REQUIRED",
    );
  }

  const updateQuery = ListerReview.findOneAndUpdate(
    {
      _id: validatedReviewId,
      listerProfileId: listerProfile._id,
      isDeleted: { $ne: true },
    },
    {
      $set: buildVisibilityUpdate({
        isCurrentlyCollapsed: review.visibility?.isCollapsed === true,
        actorId: listerUserId,
      }),
    },
    { returnDocument: "after" },
  );

  if (session) {
    updateQuery.session(session);
  }

  const updatedReview = await updateQuery;

  if (!updatedReview) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  return updatedReview;
};

export const toggleListerReviewCollapseService = async ({
  reviewId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (session) {
    return toggleListerReviewCollapse({
      reviewId,
      actorId,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let review;

    await transactionSession.withTransaction(async () => {
      review = await toggleListerReviewCollapse({
        reviewId,
        actorId,
        session: transactionSession,
      });
    });

    return review;
  } finally {
    await transactionSession.endSession();
  }
};
