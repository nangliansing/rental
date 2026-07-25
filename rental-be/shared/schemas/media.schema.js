// shared/schemas/media.schema.js
import { Schema } from "mongoose";

export const mediaSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },

    resourceType: {
      type: String,
      default: "image",
    },

    format: {
      type: String,
      default: null,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },

    bytes: {
      type: Number,
      default: null,
    },

    position: {
      type: Number,
      default: 0,
    },

    alt: {
      type: String,
      trim: true,
      default: null,
    },

    isCover: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);