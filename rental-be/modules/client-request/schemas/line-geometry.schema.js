import { Schema } from "mongoose";

import { LINE_GEOMETRY_TYPES } from "../client-request.constants.js";

export const lineGeometrySchemaDefinition = {
  type: {
    type: String,
    enum: Object.values(LINE_GEOMETRY_TYPES),
    required: true,
  },

  coordinates: {
    type: Schema.Types.Mixed,
    required: true,
  },
};

export const lineGeometrySchema = new Schema(lineGeometrySchemaDefinition, {
  _id: false,
});
