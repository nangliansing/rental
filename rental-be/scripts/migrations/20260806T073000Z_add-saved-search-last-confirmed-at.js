export const id = "20260806T073000Z_add-saved-search-last-confirmed-at";
export const description =
  "Backfill saved-search lastConfirmedAt from its original createdAt";

export const up = async ({ db }) => {
  await db.collection("client_requests").updateMany(
    {
      lastConfirmedAt: { $exists: false },
      createdAt: { $type: "date" },
    },
    [{ $set: { lastConfirmedAt: "$createdAt" } }],
  );
};
