import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  SAVED_SEARCH_STATUSES,
} from "./saved-search.constants.js";
import { geoSearchSchema, searchFiltersSchema } from "./schemas/index.js";

const savedSearchSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: SAVED_SEARCH_NAME_MAX_LENGTH,
    },

    description: {
      type: String,
      trim: true,
      maxlength: SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(SAVED_SEARCH_STATUSES),
      default: SAVED_SEARCH_STATUSES.WAITING,
      required: true,
    },

    geoSearch: {
      type: geoSearchSchema,
      required: true,
    },

    filters: {
      type: searchFiltersSchema,
      required: true,
      default: () => ({}),
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

// Owner list with status filter (default Waiting): availableBy sooner-first.
savedSearchSchema.index({
  createdBy: 1,
  isDeleted: 1,
  status: 1,
  "filters.availableBy": 1,
  createdAt: -1,
  _id: 1,
});

const SavedSearch =
  mongoose.models[MODEL_NAMES.SavedSearch] ||
  mongoose.model(
    MODEL_NAMES.SavedSearch,
    savedSearchSchema,
    COLLECTION_NAMES.SavedSearches,
  );

export default SavedSearch;
