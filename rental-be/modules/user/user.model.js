import mongoose, { Schema } from "mongoose";
import {
  USER_ROLES,
  USER_STATUSES,
  AUTH_PROVIDERS,
} from "./user.constants.js";
import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { mediaSchema } from "../../shared/schemas/index.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      select: false,
      default: null,
    },

    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.PASSWORD,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.ACTIVE,
    },

    profilePhoto: {
      type: mediaSchema,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

// Platform administrator list.
userSchema.index({ role: 1, createdAt: -1, _id: 1 });

const User =
  mongoose.models[MODEL_NAMES.User] ||
  mongoose.model(
    MODEL_NAMES.User,
    userSchema,
    COLLECTION_NAMES.Users
  );

export default User;
