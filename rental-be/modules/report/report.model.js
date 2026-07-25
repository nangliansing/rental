import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from "./report.constants.js";

const reportSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: Object.values(REPORT_TARGET_TYPES),
      default: REPORT_TARGET_TYPES.LISTING,
      required: true,
    },

    listingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Listing,
      required: true,
    },

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    reason: {
      type: String,
      enum: Object.values(REPORT_REASONS),
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(REPORT_STATUSES),
      default: REPORT_STATUSES.OPEN,
      required: true,
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

    reviewNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

reportSchema.pre("validate", function () {
  if (this.targetType !== REPORT_TARGET_TYPES.LISTING) {
    this.invalidate("targetType", "Only listing reports are supported");
  }

  const isReviewed = this.status !== REPORT_STATUSES.OPEN;

  if (!isReviewed) {
    return;
  }

  if (!this.reviewedBy) {
    this.invalidate("reviewedBy", "reviewedBy is required when reviewed");
  }

  if (!this.reviewedAt) {
    this.invalidate("reviewedAt", "reviewedAt is required when reviewed");
  }
});

// Admin report queue
reportSchema.index({
  targetType: 1,
  createdAt: -1,
  _id: 1,
});

// Admin report queue filtered by status.
reportSchema.index({
  targetType: 1,
  status: 1,
  createdAt: -1,
  _id: 1,
});

// Prevent duplicate open reports from the same user for the same listing.
reportSchema.index(
  {
    targetType: 1,
    listingId: 1,
    reportedBy: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      targetType: REPORT_TARGET_TYPES.LISTING,
      status: REPORT_STATUSES.OPEN,
    },
  },
);

const Report =
  mongoose.models[MODEL_NAMES.Report] ||
  mongoose.model(MODEL_NAMES.Report, reportSchema, COLLECTION_NAMES.Reports);

export default Report;
