import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

import { buildCreateListerReviewRecord } from "../mappers/index.js";
import ListerReview from "../lister-review.model.js";
import { validateListerReviewListerProfileId } from "../lister-review.validation.js";
import { recalculateListerReviewSummaryService } from "./recalculate-lister-review-summary.service.js";
import { resolveListerReviewRelatedBuildingId } from "./resolve-lister-review-related-building-id.service.js";

const isDuplicateReviewError = (error) => {
  return error?.code === 11000;
};

const createListerReview = async ({
  listerProfileId,
  actorId,
  body,
  session,
}) => {
  const reviewerId = validateMongooseId(actorId, "reviewerId", {
    asObjectId: true,
  });
  const validatedListerProfileId =
    validateListerReviewListerProfileId(listerProfileId);
  const draftRecord = buildCreateListerReviewRecord({
    body,
    reviewerId,
    listerProfileId: validatedListerProfileId,
  });

  const userQuery = User.findOne({
    _id: reviewerId,
    status: USER_STATUSES.ACTIVE,
  }).select("_id");
  const listerProfileQuery = AgentProfile.findOne({
    _id: validatedListerProfileId,
    isDeleted: { $ne: true },
  }).select("_id userId isDeleted isOnline");
  const existingReviewQuery = ListerReview.findOne({
    reviewerId,
    listerProfileId: validatedListerProfileId,
    isDeleted: { $ne: true },
  }).select("_id");

  if (session) {
    userQuery.session(session);
    listerProfileQuery.session(session);
    existingReviewQuery.session(session);
  }

  const user = await userQuery;
  const listerProfile = await listerProfileQuery;
  const existingReview = await existingReviewQuery;

  if (!user) {
    throw new AppError("Active user is required", 403, "ACTIVE_USER_REQUIRED");
  }

  if (!listerProfile) {
    throw new AppError(
      "Lister profile not found",
      404,
      "LISTER_PROFILE_NOT_FOUND",
    );
  }

  if (listerProfile.userId.toString() === reviewerId.toString()) {
    throw new AppError(
      "You cannot review your own profile",
      403,
      "CANNOT_REVIEW_OWN_PROFILE",
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

  if (existingReview) {
    throw new AppError(
      "You already reviewed this lister",
      409,
      "LISTER_REVIEW_ALREADY_EXISTS",
    );
  }

  const relatedBuildingId = await resolveListerReviewRelatedBuildingId({
    relatedListingId: draftRecord.relatedListingId,
    relatedBuildingId: draftRecord.relatedBuildingId,
    listerUserId: listerProfile.userId,
    session,
  });

  const record = {
    ...draftRecord,
    relatedBuildingId: relatedBuildingId ?? draftRecord.relatedBuildingId,
  };

  try {
    const [review] = await ListerReview.create(
      [record],
      session ? { session } : undefined,
    );

    const reviewSummary = await recalculateListerReviewSummaryService({
      listerProfileId: validatedListerProfileId,
      session,
    });

    return { review, reviewSummary };
  } catch (error) {
    if (isDuplicateReviewError(error)) {
      throw new AppError(
        "You already reviewed this lister",
        409,
        "LISTER_REVIEW_ALREADY_EXISTS",
      );
    }

    throw error;
  }
};

export const createListerReviewService = async ({
  listerProfileId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (session) {
    return createListerReview({
      listerProfileId,
      actorId,
      body,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await createListerReview({
        listerProfileId,
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
