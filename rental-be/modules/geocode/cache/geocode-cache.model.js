import mongoose, { Schema } from "mongoose";

import {
  COLLECTION_NAMES,
  MODEL_NAMES,
} from "../../../shared/constants/index.js";

const geocodeCacheSchema = new Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    formattedAddress: {
      type: String,
      required: true,
      trim: true,
    },
    placeId: {
      type: String,
      default: null,
      trim: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

geocodeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GeocodeCache =
  mongoose.models[MODEL_NAMES.GeocodeCache] ||
  mongoose.model(
    MODEL_NAMES.GeocodeCache,
    geocodeCacheSchema,
    COLLECTION_NAMES.GeocodeCaches,
  );

export default GeocodeCache;
