import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

import ListerReview from "../lister-review.model.js";
import { buildUpdateListerReviewRecord } from "../mappers/index.js";
import {
  validateListerReviewId,
  validateUpdateListerReviewBody,
} from "../lister-review.validation.js";
import { recalculateListerReviewSummaryService } from "./recalculate-lister-review-summary.service.js";
import { resolveListerReviewRelatedBuildingId } from "./resolve-lister-review-related-building-id.service.js";

const updateListerReview = async ({ reviewId, actorId, body, session }) => {
  const reviewerId = validateMongooseId(actorId, "reviewerId", {
    asObjectId: true,
  });
  const validatedReviewId = validateListerReviewId(reviewId);
  const validatedBody = validateUpdateListerReviewBody(body);

  const userQuery = User.findOne({
    _id: reviewerId,
    status: USER_STATUSES.ACTIVE,
  }).select("_id");
  const reviewQuery = ListerReview.findOne({
    _id: validatedReviewId,
    reviewerId,
    isDeleted: { $ne: true },
  });

  if (session) {
    userQuery.session(session);
    reviewQuery.session(session);
  }

  const user = await userQuery;
  const review = await reviewQuery;

  if (!user) {
    throw new AppError("Active user is required", 403, "ACTIVE_USER_REQUIRED");
  }

  if (!review) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  const listerProfileQuery = AgentProfile.findOne({
    _id: review.listerProfileId,
    isDeleted: { $ne: true },
  }).select("_id userId isDeleted isOnline");

  if (session) {
    listerProfileQuery.session(session);
  }

  const listerProfile = await listerProfileQuery;

  if (!listerProfile) {
    throw new AppError(
      "Lister profile not found",
      404,
      "LISTER_PROFILE_NOT_FOUND",
    );
  }

  const listerUserQuery = User.findOne({
    _id: listerProfile.userId,
    status: USER_STATUSES.ACTIVE,
  }).select("_id");

  if (session) {
    listerUserQuery.session(session);
  }

  const listerUser = await listerUserQuery;

  if (!listerUser) {
    throw new AppError(
      "Active lister is required",
      403,
      "ACTIVE_LISTER_REQUIRED",
    );
  }

  const relatedBuildingId = await resolveListerReviewRelatedBuildingId({
    relatedListingId: validatedBody.relatedListingId,
    relatedBuildingId: validatedBody.relatedBuildingId,
    listerUserId: listerProfile.userId,
    session,
    clearBuildingWhenListingCleared: true,
  });

  const updateRecord = buildUpdateListerReviewRecord({
    body: validatedBody,
    review,
    relatedBuildingId,
  });

  const updateQuery = ListerReview.findOneAndUpdate(
    {
      _id: validatedReviewId,
      reviewerId,
      isDeleted: { $ne: true },
    },
    { $set: updateRecord },
    { returnDocument: "after" },
  );

  if (session) {
    updateQuery.session(session);
  }

  const updatedReview = await updateQuery;

  if (!updatedReview) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  const reviewSummary = await recalculateListerReviewSummaryService({
    listerProfileId: updatedReview.listerProfileId,
    session,
  });

  return { review: updatedReview, reviewSummary };
};

export const updateListerReviewService = async ({
  reviewId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (session) {
    return updateListerReview({
      reviewId,
      actorId,
      body,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await updateListerReview({
        reviewId,
        actorId,
        body,
        session: transactionSession,
      });
    });

    return result;
  } finally {
    await transactionSession.endSession();
  }
};
