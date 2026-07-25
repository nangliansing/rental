import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { SUSPENSION_STATUSES } from "./suspension.constants.js";

const suspensionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(SUSPENSION_STATUSES),
      default: SUSPENSION_STATUSES.ACTIVE,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      trim: true,
      default: null,
    },

    startsAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    liftedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    liftedAt: {
      type: Date,
      default: null,
    },

    liftReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

suspensionSchema.pre("validate", function () {
  if (this.expiresAt && this.startsAt && this.expiresAt <= this.startsAt) {
    this.invalidate("expiresAt", "expiresAt must be after startsAt");
  }

  const isLifted = this.status === SUSPENSION_STATUSES.LIFTED;

  if (isLifted && !this.liftedBy) {
    this.invalidate("liftedBy", "liftedBy is required when lifted");
  }

  if (isLifted && !this.liftedAt) {
    this.invalidate("liftedAt", "liftedAt is required when lifted");
  }

  if (isLifted && !this.liftReason) {
    this.invalidate("liftReason", "liftReason is required when lifted");
  }

  if (!isLifted && (this.liftedBy || this.liftedAt || this.liftReason)) {
    this.invalidate(
      "status",
      "lift fields are only allowed when status is lifted",
    );
  }
});

// Fast active-suspension lookup for auth and account gates.
suspensionSchema.index({
  userId: 1,
  status: 1,
  expiresAt: 1,
});

// Admin suspension list, filtered by status and expiry.
suspensionSchema.index({
  status: 1,
  expiresAt: 1,
  createdAt: -1,
  _id: 1,
});

// Admin suspension timeline.
suspensionSchema.index({ createdAt: -1, _id: 1 });

// Admin suspension timeline filtered by status.
suspensionSchema.index({ status: 1, createdAt: -1, _id: 1 });

const Suspension =
  mongoose.models[MODEL_NAMES.Suspension] ||
  mongoose.model(
    MODEL_NAMES.Suspension,
    suspensionSchema,
    COLLECTION_NAMES.Suspensions,
  );

export default Suspension;
