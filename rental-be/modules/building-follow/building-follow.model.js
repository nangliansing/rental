import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { buildingFollowSchemaDefinition } from "./schemas/index.js";

const buildingFollowSchema = new Schema(buildingFollowSchemaDefinition, {
  timestamps: true,
  versionKey: false,
});

// Prevent a user from following the same building more than once.
buildingFollowSchema.index({ userId: 1, buildingId: 1 }, { unique: true });

// Paginated "my followed buildings" list sorted by newest follow first.
buildingFollowSchema.index({ userId: 1, createdAt: -1, _id: -1 });

// Paginated building followers list sorted by newest follow first.
buildingFollowSchema.index({ buildingId: 1, createdAt: -1, _id: -1 });

const BuildingFollow =
  mongoose.models[MODEL_NAMES.BuildingFollow] ||
  mongoose.model(
    MODEL_NAMES.BuildingFollow,
    buildingFollowSchema,
    COLLECTION_NAMES.BuildingFollows,
  );

export default BuildingFollow;
