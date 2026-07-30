import { Schema } from "mongoose";

import { MODEL_NAMES } from "../../../shared/constants/index.js";

export const buildingFollowSchemaDefinition = {
  userId: {
    type: Schema.Types.ObjectId,
    ref: MODEL_NAMES.User,
    required: true,
  },

  buildingId: {
    type: Schema.Types.ObjectId,
    ref: MODEL_NAMES.Building,
    required: true,
  },
};
