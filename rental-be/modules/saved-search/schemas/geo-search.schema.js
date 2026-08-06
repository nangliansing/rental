import { Schema } from "mongoose";

import {
  SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
  GEO_SEARCH_MAX_DISTANCE_METERS,
  GEO_SEARCH_MAX_RADIUS_METERS,
  GEO_SEARCH_MIN_DISTANCE_METERS,
  GEO_SEARCH_MIN_RADIUS_METERS,
  GEO_SEARCH_MODES,
} from "../saved-search.constants.js";
import { lineGeometrySchema } from "./line-geometry.schema.js";
import { mapBoundsSchema } from "./map-bounds.schema.js";
import { mapPointSchema } from "./map-point.schema.js";

export const geoSearchSchemaDefinition = {
  mode: {
    type: String,
    enum: Object.values(GEO_SEARCH_MODES),
    required: true,
  },

  bounds: {
    type: mapBoundsSchema,
  },

  position: {
    type: mapPointSchema,
  },

  radiusMeters: {
    type: Number,
    min: GEO_SEARCH_MIN_RADIUS_METERS,
    max: GEO_SEARCH_MAX_RADIUS_METERS,
  },

  geometry: {
    type: lineGeometrySchema,
  },

  distanceMeters: {
    type: Number,
    min: GEO_SEARCH_MIN_DISTANCE_METERS,
    max: GEO_SEARCH_MAX_DISTANCE_METERS,
  },

  placeName: {
    type: String,
    trim: true,
    maxlength: SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
    default: null,
  },
};

export const geoSearchSchema = new Schema(geoSearchSchemaDefinition, {
  _id: false,
});

geoSearchSchema.pre("validate", function () {
  if (this.mode === GEO_SEARCH_MODES.AREA && !this.bounds) {
    this.invalidate("bounds", "bounds is required for area search");
  }

  if (this.mode === GEO_SEARCH_MODES.NEARBY) {
    if (!this.position) {
      this.invalidate("position", "position is required for nearby search");
    }

    if (this.radiusMeters == null) {
      this.invalidate(
        "radiusMeters",
        "radiusMeters is required for nearby search",
      );
    }
  }

  if (this.mode === GEO_SEARCH_MODES.LINE) {
    if (!this.geometry) {
      this.invalidate("geometry", "geometry is required for line search");
    }

    if (this.distanceMeters == null) {
      this.invalidate(
        "distanceMeters",
        "distanceMeters is required for line search",
      );
    }
  }
});
