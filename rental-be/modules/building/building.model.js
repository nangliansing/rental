import mongoose, { Schema } from "mongoose";
import { MODEL_NAMES, COLLECTION_NAMES } from "../../shared/constants/index.js";
import { buildingDetailsSchemaDefinition } from "./schemas/index.js";

const buildingSchema = new Schema(
  {
    ...buildingDetailsSchemaDefinition,

    isActive: {
      type: Boolean,
      default: true,
    },

    minRent: {
      type: Number,
      min: 0,
      default: null,
    },

    maxRent: {
      type: Number,
      min: 0,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.User,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

buildingSchema.pre("validate", function () {
  if (
    this.minRent != null &&
    this.maxRent != null &&
    this.maxRent < this.minRent
  ) {
    this.invalidate(
      "maxRent",
      "maxRent must be greater than or equal to minRent",
    );
  }
});

buildingSchema.index({
  location: "2dsphere",
});

const Building =
  mongoose.models[MODEL_NAMES.Building] ||
  mongoose.model(
    MODEL_NAMES.Building,
    buildingSchema,
    COLLECTION_NAMES.Buildings,
  );

export default Building;
