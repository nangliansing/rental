import { Schema } from "mongoose";

export const mapPointSchemaDefinition = {
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
  },

  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
  },
};

export const mapPointSchema = new Schema(mapPointSchemaDefinition, {
  _id: false,
});
