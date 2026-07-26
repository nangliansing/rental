import mongoose, { Schema } from "mongoose";

import {
  COLLECTION_NAMES,
  MODEL_NAMES,
} from "../../../shared/constants/index.js";

const neighbourhoodCacheSchema = new Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    origin: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    fetchRadiusMeters: {
      type: Number,
      required: true,
      min: 1,
    },
    places: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
          category: { type: String, required: true },
          mode: { type: String, default: undefined },
          line: { type: String, default: undefined },
          _id: false,
        },
      ],
      default: [],
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

neighbourhoodCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NeighbourhoodCache =
  mongoose.models[MODEL_NAMES.NeighbourhoodCache] ||
  mongoose.model(
    MODEL_NAMES.NeighbourhoodCache,
    neighbourhoodCacheSchema,
    COLLECTION_NAMES.NeighbourhoodCaches,
  );

export default NeighbourhoodCache;
