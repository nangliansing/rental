import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  DEDUPE_KEY_MAX_LENGTH,
} from "./notification-delivery.constants.js";

const notificationDedupeSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: DEDUPE_KEY_MAX_LENGTH,
    },
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Notification,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

notificationDedupeSchema.index(
  { recipient: 1, dedupeKey: 1 },
  { unique: true },
);

notificationDedupeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationDedupe =
  mongoose.models[MODEL_NAMES.NotificationDedupe] ||
  mongoose.model(
    MODEL_NAMES.NotificationDedupe,
    notificationDedupeSchema,
    COLLECTION_NAMES.NotificationDedupes,
  );

export default NotificationDedupe;
