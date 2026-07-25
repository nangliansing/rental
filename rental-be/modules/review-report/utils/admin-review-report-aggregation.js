import { COLLECTION_NAMES } from "../../../shared/constants/index.js";

const buildUserLookupStage = (localField, as) => ({
  $lookup: {
    from: COLLECTION_NAMES.Users,
    localField,
    foreignField: "_id",
    pipeline: [
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          status: 1,
        },
      },
    ],
    as,
  },
});

const buildUnwindStage = (path) => ({
  $unwind: {
    path,
    preserveNullAndEmptyArrays: true,
  },
});

export const buildAdminReviewReportLookupStages = () => [
  buildUserLookupStage("reportedBy", "reportedBy"),
  buildUnwindStage("$reportedBy"),
  buildUserLookupStage("reviewOwnerId", "reviewOwner"),
  buildUnwindStage("$reviewOwner"),
  buildUserLookupStage("reviewedBy", "reviewedBy"),
  buildUnwindStage("$reviewedBy"),
  buildUserLookupStage("actionTakenBy", "actionTakenBy"),
  buildUnwindStage("$actionTakenBy"),
  {
    $lookup: {
      from: COLLECTION_NAMES.AgentProfiles,
      localField: "listerProfileId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            userId: 1,
            displayName: 1,
            profilePhoto: 1,
            supportLanguages: 1,
            isOnline: 1,
            isDeleted: 1,
            isVerified: 1,
            reviewSummary: 1,
          },
        },
      ],
      as: "listerProfile",
    },
  },
  buildUnwindStage("$listerProfile"),
  {
    $lookup: {
      from: COLLECTION_NAMES.ListerReviews,
      localField: "reviewId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            reviewerId: 1,
            listerProfileId: 1,
            relatedListingId: 1,
            relatedBuildingId: 1,
            rating: 1,
            tags: 1,
            comment: 1,
            visibility: 1,
            moderation: 1,
            editedAt: 1,
            isDeleted: 1,
            deletedAt: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
      as: "review",
    },
  },
  buildUnwindStage("$review"),
];

export const buildAdminReviewReportDetailPipeline = (reviewReportId) => [
  {
    $match: {
      _id: reviewReportId,
      isDeleted: false,
    },
  },
  { $limit: 1 },
  ...buildAdminReviewReportLookupStages(),
];
