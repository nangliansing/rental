import dotenv from "dotenv";
import mongoose from "mongoose";

import ListerReview from "../modules/lister-review/lister-review.model.js";

dotenv.config();

const LEGACY_UNIQUE_INDEX_NAME = "reviewerId_1_listerProfileId_1";
const LEGACY_STATUS_INDEX_NAMES = new Set([
  "listerProfileId_1_status_1_isDeleted_1_createdAt_-1__id_-1",
  "listerProfileId_1_status_1_isDeleted_1_rating_-1_createdAt_-1__id_-1",
  "listerProfileId_1_status_1_isDeleted_1_rating_1_createdAt_-1__id_-1",
]);

const syncListerReviewIndexes = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const indexes = await ListerReview.collection.indexes();
  const legacyIndex = indexes.find(
    (index) =>
      index.name === LEGACY_UNIQUE_INDEX_NAME &&
      index.unique === true &&
      !index.partialFilterExpression,
  );

  if (legacyIndex) {
    await ListerReview.collection.dropIndex(LEGACY_UNIQUE_INDEX_NAME);
    console.log(`Dropped legacy index: ${LEGACY_UNIQUE_INDEX_NAME}`);
  }

  const { modifiedCount } = await ListerReview.collection.updateMany(
    { status: { $exists: true } },
    { $unset: { status: "" } },
  );

  if (modifiedCount > 0) {
    console.log(`Removed legacy status field from ${modifiedCount} reviews`);
  }

  const legacyStatusIndexes = indexes.filter((index) =>
    LEGACY_STATUS_INDEX_NAMES.has(index.name),
  );

  for (const index of legacyStatusIndexes) {
    await ListerReview.collection.dropIndex(index.name);
    console.log(`Dropped legacy index: ${index.name}`);
  }

  await ListerReview.createIndexes();
  console.log("Lister review indexes are synced");
};

try {
  await syncListerReviewIndexes();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
