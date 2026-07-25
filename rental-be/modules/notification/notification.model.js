import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "./notification.constants.js";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    actor: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    entityType: {
      type: String,
      enum: Object.values(NOTIFICATION_ENTITY_TYPES),
      default: NOTIFICATION_ENTITY_TYPES.SYSTEM,
      required: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    link: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },

    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.pre("validate", function () {
  if (this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  if (!this.isRead && this.readAt) {
    this.invalidate("readAt", "readAt is only allowed when notification is read");
  }

  if (this.entityType === NOTIFICATION_ENTITY_TYPES.SYSTEM && this.entityId) {
    this.invalidate("entityId", "entityId is not allowed for system notifications");
  }

  if (this.entityType !== NOTIFICATION_ENTITY_TYPES.SYSTEM && !this.entityId) {
    this.invalidate("entityId", "entityId is required for entity notifications");
  }
});

// User notification timeline.
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
  _id: 1,
});

// User unread notification list/count.
notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
  _id: 1,
});

// Auto-remove user-facing notifications after their configured expiry.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification =
  mongoose.models[MODEL_NAMES.Notification] ||
  mongoose.model(
    MODEL_NAMES.Notification,
    notificationSchema,
    COLLECTION_NAMES.Notifications,
  );

export default Notification;
