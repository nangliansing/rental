export const id = "20260720T150000Z_add-query-indexes";
export const description = "Add sort-covering indexes for audited query paths";

const indexes = [
  ["users", { role: 1, createdAt: -1, _id: 1 }],
  [
    "listings",
    {
      buildingId: 1,
      isDeleted: 1,
      visibility: 1,
      updatedAt: -1,
      _id: 1,
    },
  ],
  [
    "listings",
    {
      buildingId: 1,
      isDeleted: 1,
      visibility: 1,
      listedBy: 1,
      updatedAt: -1,
      _id: 1,
    },
  ],
  ["reports", { targetType: 1, createdAt: -1, _id: 1 }],
  ["review_reports", { isDeleted: 1, createdAt: -1, _id: 1 }],
  ["suspensions", { createdAt: -1, _id: 1 }],
  ["suspensions", { status: 1, createdAt: -1, _id: 1 }],
  ["building_edit_requests", { createdAt: -1, _id: 1 }],
];

export const up = async ({ db }) => {
  for (const [collectionName, keys] of indexes) {
    await db.collection(collectionName).createIndex(keys);
  }
};
