import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { buildingDetailsSchema } from "../building/schemas/index.js";
import { listingDetailsSchema } from "../listing/schemas/index.js";
import { PENDING_POST_STATUSES } from "./pending-post.constants.js";

const pendingPostSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(PENDING_POST_STATUSES),
      default: PENDING_POST_STATUSES.PENDING,
      required: true,
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    existingBuildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      default: null,
    },

    building: {
      type: buildingDetailsSchema,
      default: null,
    },

    listing: {
      type: listingDetailsSchema,
      required: true,
    },

    reviewNote: {
      type: String,
      trim: true,
      default: null,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    approvedBuildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      default: null,
    },

    approvedListingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Listing,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    deleteReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

pendingPostSchema.index({ submittedBy: 1, createdAt: -1, _id: 1 });
pendingPostSchema.index({ submittedBy: 1, status: 1, createdAt: -1, _id: 1 });
pendingPostSchema.index({ createdAt: -1, _id: 1 });
pendingPostSchema.index({ status: 1, createdAt: -1, _id: 1 });

pendingPostSchema.pre("validate", function () {
  const hasExistingBuilding = this.existingBuildingId != null;
  const hasBuildingSnapshot = this.building != null;

  if (hasExistingBuilding === hasBuildingSnapshot) {
    this.invalidate(
      "building",
      "Pending post must reference an existing building or include a new building, but not both",
    );
  }

  if (!this.listing?.media || this.listing.media.length === 0) {
    this.invalidate("listing.media", "At least one listing photo is required");
  }

  if (
    this.status === PENDING_POST_STATUSES.APPROVED &&
    (!this.approvedBuildingId || !this.approvedListingId)
  ) {
    this.invalidate(
      "status",
      "Approved pending post must include approved building and listing references",
    );
  }

  if (this.status === PENDING_POST_STATUSES.REJECTED && !this.reviewNote) {
    this.invalidate("reviewNote", "reviewNote is required when rejected");
  }
});

const PendingPost =
  mongoose.models[MODEL_NAMES.PendingPost] ||
  mongoose.model(
    MODEL_NAMES.PendingPost,
    pendingPostSchema,
    COLLECTION_NAMES.PendingPosts,
  );

export default PendingPost;
