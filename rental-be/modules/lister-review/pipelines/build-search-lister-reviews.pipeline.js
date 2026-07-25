import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { LISTER_REVIEW_SORTS } from "../lister-review.constants.js";

const getSortStage = (sort) => {
  if (sort === LISTER_REVIEW_SORTS.OLDEST) {
    return { createdAt: 1, _id: 1 };
  }

  if (sort === LISTER_REVIEW_SORTS.HIGHEST) {
    return { rating: -1, createdAt: -1, _id: -1 };
  }

  if (sort === LISTER_REVIEW_SORTS.LOWEST) {
    return { rating: 1, createdAt: -1, _id: -1 };
  }

  return { createdAt: -1, _id: -1 };
};

const buildReviewerStages = () => [
  {
    $lookup: {
      from: COLLECTION_NAMES.Users,
      localField: "reviewerId",
      foreignField: "_id",
      as: "reviewerUser",
    },
  },
  {
    $unwind: {
      path: "$reviewerUser",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: COLLECTION_NAMES.AgentProfiles,
      localField: "reviewerId",
      foreignField: "userId",
      as: "reviewerProfile",
    },
  },
  {
    $unwind: {
      path: "$reviewerProfile",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      visibility: {
        isCollapsed: { $ifNull: ["$visibility.isCollapsed", false] },
        collapsedBy: { $ifNull: ["$visibility.collapsedBy", null] },
        collapsedAt: { $ifNull: ["$visibility.collapsedAt", null] },
        collapseReason: { $ifNull: ["$visibility.collapseReason", null] },
      },
      reviewer: {
        userId: "$reviewerId",
        name: "$reviewerUser.name",
        displayName: {
          $ifNull: ["$reviewerProfile.displayName", "$reviewerUser.name"],
        },
        profilePhoto: { $ifNull: ["$reviewerProfile.profilePhoto", null] },
        isVerified: { $ifNull: ["$reviewerProfile.isVerified", false] },
      },
    },
  },
  {
    $project: {
      reviewerUser: 0,
      reviewerProfile: 0,
    },
  },
];

const publicReviewProjectStage = {
  $project: {
    _id: 1,
    reviewerId: 1,
    listerProfileId: 1,
    relatedListingId: 1,
    relatedBuildingId: 1,
    rating: 1,
    tags: 1,
    comment: 1,
    interaction: {
      isVerified: { $ifNull: ["$interaction.isVerified", false] },
      verifiedBy: { $ifNull: ["$interaction.verifiedBy", null] },
      verifiedAt: { $ifNull: ["$interaction.verifiedAt", null] },
    },
    visibility: 1,
    editedAt: 1,
    createdAt: 1,
    updatedAt: 1,
    reviewer: 1,
  },
};

export const buildSearchListerReviewsPipeline = ({
  match,
  sort,
  page,
  limit,
}) => [
  { $match: match },
  { $sort: getSortStage(sort) },
  {
    $facet: {
      data: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        ...buildReviewerStages(),
        publicReviewProjectStage,
      ],
      pagination: [{ $count: "total" }],
    },
  },
  {
    $project: {
      data: 1,
      pagination: {
        $map: {
          input: "$pagination",
          as: "pageInfo",
          in: {
            total: "$$pageInfo.total",
          },
        },
      },
    },
  },
];

export const buildGetListerReviewPipeline = ({ match }) => [
  { $match: match },
  { $limit: 1 },
  ...buildReviewerStages(),
  publicReviewProjectStage,
];
