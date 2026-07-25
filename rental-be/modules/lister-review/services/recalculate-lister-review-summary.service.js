import { validateMongooseId } from "../../../shared/validators/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";

import { LISTER_REVIEW_TAGS } from "../lister-review.constants.js";
import ListerReview from "../lister-review.model.js";

const emptyRatingCounts = {
  oneStar: 0,
  twoStars: 0,
  threeStars: 0,
  fourStars: 0,
  fiveStars: 0,
};

const ratingCountFieldByRating = {
  1: "oneStar",
  2: "twoStars",
  3: "threeStars",
  4: "fourStars",
  5: "fiveStars",
};

const buildReviewSummary = (aggregationResult) => {
  const ratingSummary = aggregationResult.ratingSummary[0] ?? {
    reviewCount: 0,
    ratingSum: 0,
  };

  const reviewCount = ratingSummary.reviewCount;
  const averageRating =
    reviewCount === 0
      ? 0
      : Math.round((ratingSummary.ratingSum / reviewCount) * 10) / 10;
  const ratingCounts = aggregationResult.ratingCounts.reduce(
    (summary, item) => {
      const fieldName = ratingCountFieldByRating[item._id];

      if (fieldName) {
        summary[fieldName] = item.count;
      }

      return summary;
    },
    { ...emptyRatingCounts },
  );
  const allowedTags = new Set(Object.values(LISTER_REVIEW_TAGS));
  const tagCounts = aggregationResult.tagCounts
    .filter((item) => allowedTags.has(item._id) && item.count > 0)
    .map((item) => ({
      tag: item._id,
      count: item.count,
    }));

  return {
    averageRating,
    reviewCount,
    ratingCounts,
    tagCounts,
  };
};

export const recalculateListerReviewSummaryService = async ({
  listerProfileId,
  session = null,
}) => {
  const validatedListerProfileId = validateMongooseId(
    listerProfileId,
    "listerProfileId",
    { asObjectId: true },
  );

  const pipeline = [
    {
      $match: {
        listerProfileId: validatedListerProfileId,
        isDeleted: { $ne: true },
      },
    },
    {
      $facet: {
        ratingSummary: [
          {
            $group: {
              _id: null,
              reviewCount: { $sum: 1 },
              ratingSum: { $sum: "$rating" },
            },
          },
        ],
        ratingCounts: [
          {
            $group: {
              _id: "$rating",
              count: { $sum: 1 },
            },
          },
        ],
        tagCounts: [
          { $unwind: "$tags" },
          {
            $group: {
              _id: "$tags",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, _id: 1 } },
        ],
      },
    },
  ];

  let aggregate = ListerReview.aggregate(pipeline);

  if (session) {
    aggregate = aggregate.session(session);
  }

  const [aggregationResult = {
    ratingSummary: [],
    ratingCounts: [],
    tagCounts: [],
  }] = await aggregate;
  const reviewSummary = buildReviewSummary(aggregationResult);

  const updateQuery = AgentProfile.findByIdAndUpdate(
    validatedListerProfileId,
    { $set: { reviewSummary } },
    { returnDocument: "after" },
  );

  if (session) {
    updateQuery.session(session);
  }

  await updateQuery;

  return reviewSummary;
};
