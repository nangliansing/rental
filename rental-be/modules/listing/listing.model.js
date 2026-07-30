import mongoose, { Schema } from "mongoose";
import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { listingDetailsSchemaDefinition } from "./schemas/index.js";

const listingSchema = new Schema(
  {
    ...listingDetailsSchemaDefinition,

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },

    deleteReason: {
      type: String,
      trim: true,
      default: null,
    },

    listedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    buildingId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.Building,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// Public building/listing search
listingSchema.index({
  buildingId: 1,
  isDeleted: 1,
  visibility: 1,
  updatedAt: -1,
  _id: 1,
});

// Public building/listing search filtered by selected listers
listingSchema.index({
  buildingId: 1,
  isDeleted: 1,
  visibility: 1,
  listedBy: 1,
  updatedAt: -1,
  _id: 1,
});

// Owner listing dashboard
listingSchema.index({
  listedBy: 1,
  isDeleted: 1,
  updatedAt: -1,
  _id: 1,
});

// Owner listing dashboard filtered by visibility
listingSchema.index({
  listedBy: 1,
  isDeleted: 1,
  visibility: 1,
  updatedAt: -1,
  _id: 1,
});

// Owner "soon" tab: match on visibility + availableAt, sort by availability date
listingSchema.index({
  listedBy: 1,
  isDeleted: 1,
  visibility: 1,
  availableAt: 1,
  updatedAt: -1,
  _id: 1,
});

const Listing =
  mongoose.models[MODEL_NAMES.Listing] ||
  mongoose.model(MODEL_NAMES.Listing, listingSchema, COLLECTION_NAMES.Listings);

export default Listing;
