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

const buildUserUnwind = (path) => ({
  $unwind: {
    path,
    preserveNullAndEmptyArrays: true,
  },
});

const buildAdminSuspensionProject = () => ({
  $project: {
    userId: 1,
    status: 1,
    reason: 1,
    note: 1,
    startsAt: 1,
    expiresAt: 1,
    createdBy: { $ifNull: ["$createdBy", null] },
    liftedBy: { $ifNull: ["$liftedBy", null] },
    liftedAt: 1,
    liftReason: 1,
    createdAt: 1,
    updatedAt: 1,
    user: { $ifNull: ["$user", null] },
  },
});

export const buildAdminSuspensionLookupStages = () => [
  buildUserLookup({ localField: "userId", as: "user" }),
  buildUserUnwind("$user"),
  buildUserLookup({ localField: "createdBy", as: "createdBy" }),
  buildUserUnwind("$createdBy"),
  buildUserLookup({ localField: "liftedBy", as: "liftedBy" }),
  buildUserUnwind("$liftedBy"),
  buildAdminSuspensionProject(),
];

export const buildAdminSuspensionDetailPipeline = (suspensionId) => [
  { $match: { _id: suspensionId } },
  { $limit: 1 },
  ...buildAdminSuspensionLookupStages(),
];

export const buildAdminSuspensionListDataPipeline = ({ skip, limit }) => [
  { $sort: { createdAt: -1, _id: 1 } },
  { $skip: skip },
  { $limit: limit },
  ...buildAdminSuspensionLookupStages(),
];
