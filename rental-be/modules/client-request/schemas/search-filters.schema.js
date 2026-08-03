import { Schema } from "mongoose";

import { MODEL_NAMES } from "../../../shared/constants/index.js";
import { BUILDING_TYPES } from "../../building/building.constants.js";
import { KITCHEN_TYPES } from "../../listing/listing.constants.js";

export const searchFiltersSchemaDefinition = {
  minRent: {
    type: Number,
    min: 0,
  },

  maxRent: {
    type: Number,
    min: 0,
  },

  contractMonths: {
    type: Number,
    min: 1,
  },

  occupancy: {
    type: Number,
    min: 1,
  },

  isForeignerAccepted: {
    type: Boolean,
  },

  isTM30Provided: {
    type: Boolean,
  },

  bedroomCount: {
    type: Number,
    min: 0,
  },

  bathroomCount: {
    type: Number,
    min: 0,
  },

  kitchenType: {
    type: String,
    enum: Object.values(KITCHEN_TYPES),
  },

  isCookingAllowed: {
    type: Boolean,
  },

  isPetAllowed: {
    type: Boolean,
  },

  listingFacilities: {
    type: [{ type: String, trim: true }],
  },

  availableBy: {
    type: Date,
  },

  buildingType: {
    type: String,
    enum: Object.values(BUILDING_TYPES),
  },

  buildingFacilities: {
    type: [{ type: String, trim: true }],
  },

  security: {
    type: [{ type: String, trim: true }],
  },

  supportLanguages: {
    type: [{ type: String, trim: true }],
  },

  agentProfileIds: {
    type: [{ type: Schema.Types.ObjectId, ref: MODEL_NAMES.AgentProfile }],
  },
};

export const searchFiltersSchema = new Schema(searchFiltersSchemaDefinition, {
  _id: false,
});

searchFiltersSchema.pre("validate", function () {
  if (
    this.minRent != null &&
    this.maxRent != null &&
    this.maxRent < this.minRent
  ) {
    this.invalidate("maxRent", "maxRent must be greater than or equal to minRent");
  }
});
