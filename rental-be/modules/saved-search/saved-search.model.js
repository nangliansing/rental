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

    lastConfirmedAt: {
      type: Date,
      default: null,
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
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, response) => {
        if (response.geoSearch) {
          delete response.geoSearch.coverage;
        }

        return response;
      },
    },
  },
);

savedSearchSchema.pre("validate", function setInitialConfirmationTime() {
  if (!this.isNew || this.lastConfirmedAt != null) return;

  const creationTime = this.createdAt ?? new Date();
  this.createdAt = creationTime;
  this.lastConfirmedAt = creationTime;
});

savedSearchSchema.pre("insertMany", function setBulkInitialConfirmationTime(documents) {
  const bulkCreationTime = new Date();

  for (const document of documents) {
    if (document.lastConfirmedAt != null) continue;

    const creationTime = document.createdAt ?? bulkCreationTime;
    document.createdAt = creationTime;
    document.lastConfirmedAt = creationTime;
  }
});

// Owner list with status filter: confirmation recency with stable pagination.
savedSearchSchema.index(
  {
    createdBy: 1,
    isDeleted: 1,
    status: 1,
    lastConfirmedAt: -1,
    createdAt: -1,
    _id: 1,
  },
  { name: "owner_saved_search_confirmation_recency" },
);

savedSearchSchema.index(
  {
    "geoSearch.coverage": "2dsphere",
  },
  {
    name: "active_saved_search_coverage_2dsphere",
    partialFilterExpression: {
      status: SAVED_SEARCH_STATUSES.WAITING,
      isDeleted: false,
    },
  },
);

const SavedSearch =
  mongoose.models[MODEL_NAMES.SavedSearch] ||
  mongoose.model(
    MODEL_NAMES.SavedSearch,
    savedSearchSchema,
    COLLECTION_NAMES.SavedSearches,
  );

export default SavedSearch;
