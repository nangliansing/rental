import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { LISTING_DETAILS_MONGO_PROJECT } from "../../listing/constants/listing-details.projection.js";
import { REPORT_TARGET_TYPES } from "../report.constants.js";

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

export const buildAdminReportLookupStages = () => [
  buildUserLookupStage("reportedBy", "reportedBy"),
  buildUnwindStage("$reportedBy"),
  {
    $lookup: {
      from: COLLECTION_NAMES.Listings,
      localField: "listingId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            ...LISTING_DETAILS_MONGO_PROJECT,
            isDeleted: 1,
            listedBy: 1,
            buildingId: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
      as: "listing",
    },
  },
  buildUnwindStage("$listing"),
  buildUserLookupStage("listing.listedBy", "listingOwner"),
  buildUnwindStage("$listingOwner"),
  {
    $lookup: {
      from: COLLECTION_NAMES.AgentProfiles,
      localField: "listing.listedBy",
      foreignField: "userId",
      pipeline: [
        {
          $project: {
            userId: 1,
            displayName: 1,
            profilePhoto: 1,
            phone: 1,
            lineUrl: 1,
            whatsappPhone: 1,
            telegramUrl: 1,
            viberPhone: 1,
            supportLanguages: 1,
            isOnline: 1,
            isDeleted: 1,
            isVerified: 1,
          },
        },
      ],
      as: "listingAgentProfile",
    },
  },
  buildUnwindStage("$listingAgentProfile"),
  {
    $lookup: {
      from: COLLECTION_NAMES.Buildings,
      localField: "listing.buildingId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            name: 1,
            buildingType: 1,
            address: 1,
            location: 1,
            isActive: 1,
          },
        },
      ],
      as: "building",
    },
  },
  buildUnwindStage("$building"),
  buildUserLookupStage("reviewedBy", "reviewedBy"),
  buildUnwindStage("$reviewedBy"),
  {
    $project: {
      targetType: 1,
      listingId: 1,
      reportedBy: 1,
      reason: 1,
      note: 1,
      status: 1,
      reviewedBy: 1,
      reviewedAt: 1,
      reviewNote: 1,
      listing: 1,
      listingOwner: 1,
      listingAgentProfile: 1,
      building: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  },
];

export const buildAdminReportDetailPipeline = (reportId) => [
  {
    $match: {
      _id: reportId,
      targetType: REPORT_TARGET_TYPES.LISTING,
    },
  },
  { $limit: 1 },
  ...buildAdminReportLookupStages(),
];
