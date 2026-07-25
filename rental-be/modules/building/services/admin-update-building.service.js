// modules/building/services/admin-update-building.service.js
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { validateAdminReason } from "../../../shared/validators/index.js";
import { buildUpdateBuildingRecord } from "../mappers/index.js";
import Building from "../building.model.js";

export const adminUpdateBuildingService = async (
  buildingId,
  body,
  actorId,
  session = null
) => {
  validateNullableObject(session, "session");

  const validatedBuildingId = validateMongooseId(buildingId, "buildingId");
  const reason = validateAdminReason(body.reason);
  const update = buildUpdateBuildingRecord(body, actorId);

  let updateQuery = Building.findByIdAndUpdate(
    validatedBuildingId,
    { $set: update },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  const building = await updateQuery;

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  // TODO(v2): Notify affected listing owners/agents if this building update impacts their listings.
  // Include: buildingId = validatedBuildingId, actorId, reason, update.

  return building;
};