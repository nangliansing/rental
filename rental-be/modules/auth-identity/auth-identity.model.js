import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { AUTH_PROVIDERS } from "../user/user.constants.js";

const authIdentitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
      immutable: true,
    },

    provider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      required: true,
      immutable: true,
    },

    providerSubject: {
      type: String,
      trim: true,
      default: null,
      immutable: true,
    },

    providerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },

    passwordHash: {
      type: String,
      select: false,
      default: null,
    },

    lastAuthenticatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

authIdentitySchema.pre("validate", function () {
  const isPassword = this.provider === AUTH_PROVIDERS.PASSWORD;
  const isGoogle = this.provider === AUTH_PROVIDERS.GOOGLE;

  if (isPassword && !this.passwordHash) {
    this.invalidate("passwordHash", "passwordHash is required for PASSWORD");
  }

  if (isPassword && this.providerSubject !== null) {
    this.invalidate(
      "providerSubject",
      "providerSubject must be null for PASSWORD",
    );
  }

  if (isGoogle && !this.providerSubject) {
    this.invalidate("providerSubject", "providerSubject is required for GOOGLE");
  }

  if (isGoogle && this.passwordHash !== null) {
    this.invalidate("passwordHash", "passwordHash must be null for GOOGLE");
  }
});

authIdentitySchema.index(
  { userId: 1, provider: 1 },
  { unique: true, name: "auth_identity_user_provider_unique" },
);

authIdentitySchema.index(
  { provider: 1, providerSubject: 1 },
  {
    unique: true,
    name: "auth_identity_provider_subject_unique",
    partialFilterExpression: { providerSubject: { $type: "string" } },
  },
);

const AuthIdentity =
  mongoose.models[MODEL_NAMES.AuthIdentity] ||
  mongoose.model(
    MODEL_NAMES.AuthIdentity,
    authIdentitySchema,
    COLLECTION_NAMES.AuthIdentities,
  );

export default AuthIdentity;
