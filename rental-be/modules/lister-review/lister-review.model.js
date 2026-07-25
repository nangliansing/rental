import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  LISTER_REVIEW_TAGS,
  LISTER_REVIEW_VERIFICATION_SOURCES,
} from "./lister-review.constants.js";

const listerReviewInteractionSchema = new Schema(
  {
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
    },

    verifiedBy: {
      type: String,
      enum: Object.values(LISTER_REVIEW_VERIFICATION_SOURCES),
      default: null,
    },

    contactEventId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const listerReviewModerationSchema = new Schema(
  {
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    hiddenAt: {
      type: Date,
      default: null,
    },

    hiddenReason: {
      type: String,
      trim: true,
      default: null,
    },

    removedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    removedAt: {
      type: Date,
      default: null,
    },

    removedReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const listerReviewVisibilitySchema = new Schema(
  {
    isCollapsed: {
      type: Boolean,
      default: false,
      required: true,
    },

    collapsedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    collapsedAt: {
      type: Date,
      default: null,
    },

    collapseReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const listerReviewSchema = new Schema(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    listerProfileId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.AgentProfile,
      required: true,
    },

    relatedListingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Listing,
      default: null,
    },

    relatedBuildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      default: null,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    tags: {
      type: [
        {
          type: String,
          enum: Object.values(LISTER_REVIEW_TAGS),
        },
      ],
      default: [],
    },

    comment: {
      type: String,
      trim: true,
      default: null,
    },

    interaction: {
      type: listerReviewInteractionSchema,
      default: () => ({}),
      required: true,
    },

    moderation: {
      type: listerReviewModerationSchema,
      default: () => ({}),
      required: true,
    },

    visibility: {
      type: listerReviewVisibilitySchema,
      default: () => ({}),
      required: true,
    },

    editedAt: {
      type: Date,
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
  },
  { timestamps: true, versionKey: false },
);

listerReviewSchema.pre("validate", function () {
  if (!this.interaction?.isVerified) {
    return;
  }

  if (!this.interaction.verifiedBy) {
    this.invalidate("interaction.verifiedBy", "verifiedBy is required");
  }

  if (!this.interaction.verifiedAt) {
    this.invalidate("interaction.verifiedAt", "verifiedAt is required");
  }
});

// Prevent multiple active reviews for the same lister profile.
listerReviewSchema.index(
  { reviewerId: 1, listerProfileId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

listerReviewSchema.index({
  listerProfileId: 1,
  isDeleted: 1,
  createdAt: -1,
  _id: -1,
});

listerReviewSchema.index({
  listerProfileId: 1,
  isDeleted: 1,
  rating: -1,
  createdAt: -1,
  _id: -1,
});

listerReviewSchema.index({
  listerProfileId: 1,
  isDeleted: 1,
  rating: 1,
  createdAt: -1,
  _id: -1,
});

const ListerReview =
  mongoose.models[MODEL_NAMES.ListerReview] ||
  mongoose.model(
    MODEL_NAMES.ListerReview,
    listerReviewSchema,
    COLLECTION_NAMES.ListerReviews,
  );

export default ListerReview;
