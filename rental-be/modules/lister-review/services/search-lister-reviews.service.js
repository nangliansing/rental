import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizePagination } from "../../../shared/utils/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

import ListerReview from "../lister-review.model.js";
import {
  validateListerReviewListerProfileId,
  validateSearchListerReviewsQuery,
} from "../lister-review.validation.js";
import {
  buildGetListerReviewPipeline,
  buildSearchListerReviewsPipeline,
} from "../pipelines/index.js";

const normalizeViewerId = (viewerUserId) => {
  if (!viewerUserId) return null;

  return validateMongooseId(viewerUserId, "viewerUserId", {
    asObjectId: true,
  });
};

export const searchListerReviewsService = async ({
  listerProfileId,
  viewerUserId = null,
  queryInput = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedListerProfileId =
    validateListerReviewListerProfileId(listerProfileId);
  const viewerId = normalizeViewerId(viewerUserId);
  const params = validateSearchListerReviewsQuery(queryInput);

  const listerProfileQuery = AgentProfile.findOne({
    _id: validatedListerProfileId,
    isDeleted: { $ne: true },
  }).select("_id userId");

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
      "Lister profile not found",
      404,
      "LISTER_PROFILE_NOT_FOUND",
    );
  }

  const baseMatch = {
    listerProfileId: validatedListerProfileId,
    isDeleted: false,
  };
  let myReview = null;

  if (viewerId) {
    let viewerReviewQuery = ListerReview.aggregate(
      buildGetListerReviewPipeline({
        match: {
          ...baseMatch,
          reviewerId: viewerId,
        },
      }),
    );

    if (session) {
      viewerReviewQuery = viewerReviewQuery.session(session);
    }

    const [viewerReview] = await viewerReviewQuery;

    myReview = viewerReview ?? null;
  }

  const reviewsMatch = viewerId
    ? {
        ...baseMatch,
        reviewerId: { $ne: viewerId },
      }
    : baseMatch;

  let reviewsQuery = ListerReview.aggregate(
    buildSearchListerReviewsPipeline({
      match: reviewsMatch,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    }),
  );

  if (session) {
    reviewsQuery = reviewsQuery.session(session);
  }

  const [result] = await reviewsQuery;

  return {
    myReview,
    reviews: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, params.page, params.limit),
  };
};
