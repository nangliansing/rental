import { Schema } from "mongoose";

import { mediaSchema } from "../../../shared/schemas/index.js";
import { KITCHEN_TYPES, LISTING_VISIBILITIES } from "../listing.constants.js";

export const listingDetailsSchemaDefinition = {
  visibility: {
    type: String,
    enum: Object.values(LISTING_VISIBILITIES),
    default: LISTING_VISIBILITIES.PUBLIC,
    required: true,
  },

  isForeignerAccepted: {
    type: Boolean,
    required: true,
  },

  isTM30Provided: {
    type: Boolean,
    required: true,
  },

  rent: {
    type: Number,
    min: 0,
    required: true,
  },

  deposit: {
    type: Number,
    min: 0,
    required: true,
  },

  moveInCost: {
    type: Number,
    min: 0,
    required: true,
  },

  electricRate: {
    type: Number,
    min: 0,
    max: 50,
    default: null,
  },

  waterRate: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  bedroomCount: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: "bedroomCount must be an integer",
    },
  },

  bathroomCount: {
    type: Number,
    default: 1,
    min: 0,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: "bathroomCount must be an integer",
    },
  },

  kitchenType: {
    type: String,
    enum: Object.values(KITCHEN_TYPES),
    default: KITCHEN_TYPES.NO_KITCHEN,
    required: true,
  },

  size: {
    type: Number,
    min: 0,
    default: null,
  },

  contractMonths: {
    type: Number,
    default: 3,
    min: 1,
    required: true,
  },

  occupancy: {
    type: Number,
    default: 1,
    min: 1,
    required: true,
  },

  isCookingAllowed: {
    type: Boolean,
    required: true,
  },

  isPetAllowed: {
    type: Boolean,
    required: true,
  },

  facilities: {
    type: [{ type: String, trim: true }],
    default: [],
  },

  media: {
    type: [mediaSchema],
    default: [],
  },

  description: {
    type: String,
    trim: true,
    default: null,
  },

  // null = flexible/unknown; date <= today = available now; date > today = available from that date.
  // Create: omitted or null -> flexible. Update: omitted -> unchanged; null -> flexible.
  availableAt: {
    type: Date,
    default: null,
  },
};

export const listingDetailsSchema = new Schema(listingDetailsSchemaDefinition, {
  _id: false,
});
