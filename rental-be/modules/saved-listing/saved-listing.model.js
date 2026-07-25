import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { mediaSchema } from "../../shared/schemas/index.js";
import { LISTING_VISIBILITIES } from "../listing/listing.constants.js";

const savedListingSnapshotSchema = new Schema(
  {
    rent: {
      type: Number,
      min: 0,
      default: null,
    },

    visibility: {
      type: String,
      enum: Object.values(LISTING_VISIBILITIES),
      default: LISTING_VISIBILITIES.PUBLIC,
      required: true,
    },

    buildingName: {
      type: String,
      trim: true,
      default: null,
    },

    coverPhoto: {
      type: mediaSchema,
      default: null,
    },
  },
  { _id: false },
);

const savedListingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    listingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Listing,
      required: true,
    },

    buildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      required: true,
    },

    listedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    snapshot: {
      type: savedListingSnapshotSchema,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// Prevent a user from saving the same listing more than once.
savedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });
savedListingSchema.index({ userId: 1, createdAt: -1, _id: -1 });

const SavedListing =
  mongoose.models[MODEL_NAMES.SavedListing] ||
  mongoose.model(
    MODEL_NAMES.SavedListing,
    savedListingSchema,
    COLLECTION_NAMES.SavedListings,
  );

export default SavedListing;
