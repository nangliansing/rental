import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import ListerReview from "../lister-review.model.js";
import { validateListerReviewId } from "../lister-review.validation.js";
import { recalculateListerReviewSummaryService } from "./recalculate-lister-review-summary.service.js";

const deleteListerReview = async ({ reviewId, actorId, session }) => {
  const reviewerId = validateMongooseId(actorId, "reviewerId", {
    asObjectId: true,
  });
  const validatedReviewId = validateListerReviewId(reviewId);

  const deleteQuery = ListerReview.findOneAndUpdate(
    {
      _id: validatedReviewId,
      reviewerId,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (session) {
    deleteQuery.session(session);
  }

  const deletedReview = await deleteQuery;

  if (!deletedReview) {
    throw new AppError("Review not found", 404, "LISTER_REVIEW_NOT_FOUND");
  }

  const reviewSummary = await recalculateListerReviewSummaryService({
    listerProfileId: deletedReview.listerProfileId,
    session,
  });

  return { review: deletedReview, reviewSummary };
};

export const deleteListerReviewService = async ({
  reviewId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (session) {
    return deleteListerReview({
      reviewId,
      actorId,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await deleteListerReview({
        reviewId,
        actorId,
        session: transactionSession,
      });
    });

    return result;
  } finally {
    await transactionSession.endSession();
  }
};
