import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  REVIEW_REPORT_REASONS,
  REVIEW_REPORT_STATUSES,
} from "./review-report.constants.js";

const reviewReportSchema = new Schema(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.ListerReview,
      required: true,
    },

    listerProfileId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.AgentProfile,
      required: true,
    },

    reviewOwnerId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    reason: {
      type: String,
      enum: Object.values(REVIEW_REPORT_REASONS),
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(REVIEW_REPORT_STATUSES),
      default: REVIEW_REPORT_STATUSES.OPEN,
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

    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    actionTakenAt: {
      type: Date,
      default: null,
    },

    actionReason: {
      type: String,
      trim: true,
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

reviewReportSchema.pre("validate", function () {
  if (this.status === REVIEW_REPORT_STATUSES.OPEN) {
    return;
  }

  if (!this.reviewedBy) {
    this.invalidate("reviewedBy", "reviewedBy is required");
  }

  if (!this.reviewedAt) {
    this.invalidate("reviewedAt", "reviewedAt is required");
  }

  if (this.status !== REVIEW_REPORT_STATUSES.ACTION_TAKEN) {
    return;
  }

  if (!this.actionTakenBy) {
    this.invalidate("actionTakenBy", "actionTakenBy is required");
  }

  if (!this.actionTakenAt) {
    this.invalidate("actionTakenAt", "actionTakenAt is required");
  }

  if (!this.actionReason) {
    this.invalidate("actionReason", "actionReason is required");
  }
});

// Prevent duplicate open reports from the same user for the same review.
reviewReportSchema.index(
  { reviewId: 1, reportedBy: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: REVIEW_REPORT_STATUSES.OPEN,
    },
  },
);

// Admin review-report queue.
reviewReportSchema.index({
  isDeleted: 1,
  createdAt: -1,
  _id: 1,
});

// Admin review-report queue filtered by status.
reviewReportSchema.index({
  isDeleted: 1,
  status: 1,
  createdAt: -1,
  _id: 1,
});

const ReviewReport =
  mongoose.models[MODEL_NAMES.ReviewReport] ||
  mongoose.model(
    MODEL_NAMES.ReviewReport,
    reviewReportSchema,
    COLLECTION_NAMES.ReviewReports,
  );

export default ReviewReport;
