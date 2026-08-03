import { Schema } from "mongoose";

import { mapPointSchema } from "./map-point.schema.js";

export const mapBoundsSchemaDefinition = {
  northEast: {
    type: mapPointSchema,
    required: true,
  },

  southWest: {
    type: mapPointSchema,
    required: true,
  },
};

export const mapBoundsSchema = new Schema(mapBoundsSchemaDefinition, {
  _id: false,
});

mapBoundsSchema.pre("validate", function () {
  if (!this.northEast || !this.southWest) {
    return;
  }

  if (this.northEast.lat <= this.southWest.lat) {
    this.invalidate(
      "northEast.lat",
      "northEast.lat must be greater than southWest.lat",
    );
  }

  if (this.northEast.lng <= this.southWest.lng) {
    this.invalidate(
      "northEast.lng",
      "northEast.lng must be greater than southWest.lng",
    );
  }
});
