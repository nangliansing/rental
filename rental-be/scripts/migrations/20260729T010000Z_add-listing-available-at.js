export const id = "20260729T010000Z_add-listing-available-at";
export const description =
  "Backfill listing availableAt as null where the field is missing";

export const up = async ({ db }) => {
  await db.collection("listings").updateMany(
    { availableAt: { $exists: false } },
    { $set: { availableAt: null } },
  );

  await db.collection("pending_posts").updateMany(
    {
      listing: { $type: "object" },
      "listing.availableAt": { $exists: false },
    },
    { $set: { "listing.availableAt": null } },
  );
};
