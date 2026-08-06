export const id = "20260806T090000Z_add-saved-search-owner-recency-index";
export const description =
  "Add the confirmation-recency index for owner SavedSearch lists";

export const up = async ({ db }) => {
  const collection = db.collection("client_requests");

  await collection.createIndex(
    {
      createdBy: 1,
      isDeleted: 1,
      status: 1,
      lastConfirmedAt: -1,
      createdAt: -1,
      _id: 1,
    },
    { name: "owner_saved_search_confirmation_recency" },
  );

  const obsoleteKey = JSON.stringify({
    createdBy: 1,
    isDeleted: 1,
    status: 1,
    "filters.availableBy": 1,
    createdAt: -1,
    _id: 1,
  });
  const indexes = await collection.indexes();

  for (const index of indexes) {
    if (JSON.stringify(index.key) === obsoleteKey) {
      await collection.dropIndex(index.name);
    }
  }
};
