import mongoose, { Schema } from "mongoose";

import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
  CLIENT_REQUEST_STATUSES,
} from "./client-request.constants.js";
import { geoSearchSchema, searchFiltersSchema } from "./schemas/index.js";

const clientRequestSchema = new Schema(
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
      maxlength: CLIENT_REQUEST_NAME_MAX_LENGTH,
    },

    description: {
      type: String,
      trim: true,
      maxlength: CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(CLIENT_REQUEST_STATUSES),
      default: CLIENT_REQUEST_STATUSES.WAITING,
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

const ClientRequest =
  mongoose.models[MODEL_NAMES.ClientRequest] ||
  mongoose.model(
    MODEL_NAMES.ClientRequest,
    clientRequestSchema,
    COLLECTION_NAMES.ClientRequests,
  );

export default ClientRequest;
