import { COLLECTION_NAMES } from "../../../shared/constants/index.js";

import { USER_ROLES } from "../user.constants.js";

export const buildAdminUserProject = () => ({
  $project: buildAdminUserProjection(),
});

export const buildAdminUserProjection = () => ({
  name: 1,
  email: 1,
  role: 1,
  status: 1,
  authProvider: 1,
  createdAt: 1,
  updatedAt: 1,
});

export const buildPlatformAdminMatch = () => ({
  role: { $in: [USER_ROLES.OWNER, USER_ROLES.ADMIN] },
});

export const buildPlatformAdminListDataPipeline = ({ skip, limit }) => [
  { $sort: { role: 1, createdAt: -1, _id: 1 } },
  { $skip: skip },
  { $limit: limit },
  buildAdminUserProject(),
];

export const buildAdminUserAgentProfileProject = () => ({
  $project: {
    userId: 1,
    isActive: 1,
    isDeleted: 1,
    displayName: 1,
    profilePhoto: 1,
    description: 1,
    phone: 1,
    lineUrl: 1,
    whatsappPhone: 1,
    telegramUrl: 1,
    viberPhone: 1,
    supportLanguages: 1,
    isVerified: 1,
    verifiedBy: 1,
    verifiedAt: 1,
    createdAt: 1,
    updatedAt: 1,
  },
});

export const buildAdminUserAgentProfileLookup = () => ({
  $lookup: {
    from: COLLECTION_NAMES.AgentProfiles,
    localField: "_id",
    foreignField: "userId",
    pipeline: [buildAdminUserAgentProfileProject()],
    as: "agentProfile",
  },
});

export const buildAdminUserDetailPipeline = (userId) => [
  { $match: { _id: userId } },
  { $limit: 1 },
  buildAdminUserProject(),
  buildAdminUserAgentProfileLookup(),
  {
    $unwind: {
      path: "$agentProfile",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      agentProfile: { $ifNull: ["$agentProfile", null] },
    },
  },
];
