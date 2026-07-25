import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import Building from "../building.model.js";
import {
  ACTIVE_BUILDING_FILTER,
  PUBLIC_BUILDING_DETAIL_SELECT,
} from "./building-query.constants.js";

export const getBuildingByIdService = async (
  buildingIdInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const buildingId = validateMongooseId(buildingIdInput, "buildingId");

  let query = Building.findOne({
    _id: buildingId,
    ...ACTIVE_BUILDING_FILTER,
  })
    .select(PUBLIC_BUILDING_DETAIL_SELECT)
    .lean();

  if (session) {
    query = query.session(session);
  }

  const building = await query;

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  return building;
};
