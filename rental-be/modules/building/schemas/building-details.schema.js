import { Schema } from "mongoose";

import { BUILDING_TYPES } from "../building.constants.js";

export const buildingDetailsSchemaDefinition = {
  name: {
    type: String,
    required: true,
    trim: true,
  },

  buildingType: {
    type: String,
    enum: Object.values(BUILDING_TYPES),
    default: BUILDING_TYPES.APARTMENT,
    required: true,
  },

  facilities: {
    type: [{ type: String, trim: true }],
    default: [],
  },

  security: {
    type: [{ type: String, trim: true }],
    default: [],
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length === 2 &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90,
        message:
          "Coordinates must be [lng, lat] with valid longitude and latitude",
      },
    },
  },

  address: {
    type: String,
    trim: true,
    default: null,
  },
};

export const buildingDetailsSchema = new Schema(
  buildingDetailsSchemaDefinition,
  { _id: false },
);
