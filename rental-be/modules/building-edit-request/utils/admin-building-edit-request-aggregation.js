import { COLLECTION_NAMES } from "../../../shared/constants/index.js";

const buildUserLookup = ({ localField, as }) => ({
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

const buildUnwind = (path) => ({
  $unwind: {
    path,
    preserveNullAndEmptyArrays: true,
  },
});

const buildAgentProfileLookup = () => ({
  $lookup: {
    from: COLLECTION_NAMES.AgentProfiles,
    localField: "requestedBy._id",
    foreignField: "userId",
    pipeline: [
      {
        $project: {
          userId: 1,
          isOnline: 1,
          isDeleted: 1,
          displayName: 1,
          profilePhoto: 1,
          phone: 1,
          lineUrl: 1,
          whatsappPhone: 1,
          telegramUrl: 1,
          viberPhone: 1,
          supportLanguages: 1,
          isVerified: 1,
        },
      },
    ],
    as: "agentProfile",
  },
});

const buildBuildingLookup = () => ({
  $lookup: {
    from: COLLECTION_NAMES.Buildings,
    localField: "buildingId",
    foreignField: "_id",
    pipeline: [
      {
        $project: {
          name: 1,
          buildingType: 1,
          facilities: 1,
          security: 1,
          location: 1,
          address: 1,
          minRent: 1,
          maxRent: 1,
          isActive: 1,
        },
      },
    ],
    as: "building",
  },
});

const buildAdminBuildingEditRequestProject = () => ({
  $project: {
    status: 1,
    buildingId: 1,
    requestedBy: { $ifNull: ["$requestedBy", null] },
    agentProfile: { $ifNull: ["$agentProfile", null] },
    building: { $ifNull: ["$building", null] },
    requestReason: 1,
    originalBuilding: 1,
    proposedBuilding: 1,
    reviewedBy: { $ifNull: ["$reviewedBy", null] },
    reviewedAt: 1,
    reviewReason: 1,
    createdAt: 1,
    updatedAt: 1,
  },
});

export const buildAdminBuildingEditRequestLookupStages = () => [
  buildUserLookup({ localField: "requestedBy", as: "requestedBy" }),
  buildUnwind("$requestedBy"),
  buildAgentProfileLookup(),
  buildUnwind("$agentProfile"),
  buildBuildingLookup(),
  buildUnwind("$building"),
  buildUserLookup({ localField: "reviewedBy", as: "reviewedBy" }),
  buildUnwind("$reviewedBy"),
  buildAdminBuildingEditRequestProject(),
];

export const buildAdminBuildingEditRequestDetailPipeline = (
  buildingEditRequestId,
) => [
  { $match: { _id: buildingEditRequestId } },
  { $limit: 1 },
  ...buildAdminBuildingEditRequestLookupStages(),
];

export const buildAdminBuildingEditRequestListDataPipeline = ({
  skip,
  limit,
}) => [
  { $sort: { createdAt: -1, _id: 1 } },
  { $skip: skip },
  { $limit: limit },
  ...buildAdminBuildingEditRequestLookupStages(),
];
