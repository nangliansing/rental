// modules/agent/agent-profile.model.js
import mongoose, { Schema } from "mongoose";
import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { mediaSchema } from "../../shared/schemas/index.js";
import { LISTER_REVIEW_TAGS } from "../lister-review/lister-review.constants.js";

const agentProfileReviewRatingCountsSchema = new Schema(
  {
    oneStar: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    twoStars: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    threeStars: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    fourStars: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    fiveStars: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
  },
  { _id: false }
);

const agentProfileReviewTagCountSchema = new Schema(
  {
    tag: {
      type: String,
      enum: Object.values(LISTER_REVIEW_TAGS),
      required: true,
    },

    count: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
  },
  { _id: false }
);

const agentProfileReviewSummarySchema = new Schema(
  {
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
      required: true,
    },

    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },

    ratingCounts: {
      type: agentProfileReviewRatingCountsSchema,
      default: () => ({}),
      required: true,
    },

    tagCounts: {
      type: [agentProfileReviewTagCountSchema],
      default: [],
    },
  },
  { _id: false }
);

const agentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
      unique: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
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

    displayName: {
      type: String,
      trim: true,
      default: null,
    },

    profilePhoto: {
      type: mediaSchema,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    lineUrl: {
      type: String,
      trim: true,
      default: null,
    },

    whatsappPhone: {
      type: String,
      trim: true,
      default: null,
    },

    telegramUrl: {
      type: String,
      trim: true,
      default: null,
    },

    viberPhone: {
      type: String,
      trim: true,
      default: null,
    },

    supportLanguages: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    reviewSummary: {
      type: agentProfileReviewSummarySchema,
      default: () => ({}),
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

const AgentProfile =
  mongoose.models[MODEL_NAMES.AgentProfile] ||
  mongoose.model(
    MODEL_NAMES.AgentProfile,
    agentProfileSchema,
    COLLECTION_NAMES.AgentProfiles
  );

export default AgentProfile;
