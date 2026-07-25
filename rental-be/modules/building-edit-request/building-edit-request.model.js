import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { buildingDetailsSchema } from "../building/schemas/index.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "./building-edit-request.constants.js";

const buildingEditRequestSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(BUILDING_EDIT_REQUEST_STATUSES),
      default: BUILDING_EDIT_REQUEST_STATUSES.PENDING,
      required: true,
    },

    buildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      required: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    requestReason: {
      type: String,
      trim: true,
      default: null,
    },

    originalBuilding: {
      type: buildingDetailsSchema,
      required: true,
    },

    proposedBuilding: {
      type: buildingDetailsSchema,
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

    reviewReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

buildingEditRequestSchema.pre("validate", function () {
  const isReviewed =
    this.status === BUILDING_EDIT_REQUEST_STATUSES.APPROVED ||
    this.status === BUILDING_EDIT_REQUEST_STATUSES.REJECTED;

  if (!isReviewed) {
    return;
  }

  if (!this.reviewedBy) {
    this.invalidate("reviewedBy", "reviewedBy is required when reviewed");
  }

  if (!this.reviewedAt) {
    this.invalidate("reviewedAt", "reviewedAt is required when reviewed");
  }

  if (!this.reviewReason) {
    this.invalidate("reviewReason", "reviewReason is required when reviewed");
  }
});

// Admin building-edit-request queue.
buildingEditRequestSchema.index({ createdAt: -1, _id: 1 });

// Admin building-edit-request queue filtered by status.
buildingEditRequestSchema.index({
  status: 1,
  createdAt: -1,
  _id: 1,
});

buildingEditRequestSchema.index({
  requestedBy: 1,
  status: 1,
  createdAt: -1,
  _id: 1,
});

buildingEditRequestSchema.index(
  {
    buildingId: 1,
    requestedBy: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: BUILDING_EDIT_REQUEST_STATUSES.PENDING,
    },
  },
);

const BuildingEditRequest =
  mongoose.models[MODEL_NAMES.BuildingEditRequest] ||
  mongoose.model(
    MODEL_NAMES.BuildingEditRequest,
    buildingEditRequestSchema,
    COLLECTION_NAMES.BuildingEditRequests,
  );

export default BuildingEditRequest;
