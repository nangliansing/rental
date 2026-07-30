import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import {
  ACTIVE_BUILDING_FILTER,
  PUBLIC_BUILDING_DETAIL_SELECT,
} from "../../building/services/building-query.constants.js";
import { USER_STATUSES } from "../../user/user.constants.js";

const PUBLIC_BUILDING_DETAIL_PROJECT = Object.fromEntries(
  PUBLIC_BUILDING_DETAIL_SELECT.split(" ").map((field) => [field, 1]),
);

export const buildActiveUserFollowerLookupStages = () => [
  {
    $lookup: {
      from: COLLECTION_NAMES.Users,
      let: { userId: "$userId" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$userId"] },
            status: USER_STATUSES.ACTIVE,
          },
        },
        {
          $lookup: {
            from: COLLECTION_NAMES.AgentProfiles,
            localField: "_id",
            foreignField: "userId",
            as: "agentProfile",
          },
        },
        {
          $unwind: {
            path: "$agentProfile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            displayName: {
              $ifNull: ["$agentProfile.displayName", "$name"],
            },
            profilePhoto: { $ifNull: ["$agentProfile.profilePhoto", null] },
            isVerified: { $ifNull: ["$agentProfile.isVerified", false] },
          },
        },
      ],
      as: "user",
    },
  },
  {
    $unwind: {
      path: "$user",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $set: {
      user: { $ifNull: ["$user", null] },
    },
  },
];

export const buildActiveBuildingFollowingLookupStages = () => [
  {
    $lookup: {
      from: COLLECTION_NAMES.Buildings,
      let: { buildingId: "$buildingId" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$buildingId"] },
            ...ACTIVE_BUILDING_FILTER,
          },
        },
        {
          $project: PUBLIC_BUILDING_DETAIL_PROJECT,
        },
      ],
      as: "building",
    },
  },
  {
    $unwind: {
      path: "$building",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $set: {
      building: { $ifNull: ["$building", null] },
    },
  },
];
