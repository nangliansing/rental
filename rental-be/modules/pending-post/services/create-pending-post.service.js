import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import { buildCreatePendingPostRecord } from "../mappers/index.js";
import PendingPost from "../pending-post.model.js";

export const createPendingPostService = async (
  body,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const submittedBy = validateMongooseId(actorId, "submittedBy");
  const record = buildCreatePendingPostRecord(body, submittedBy);

  if (record.existingBuildingId) {
    let buildingQuery = Building.findById(record.existingBuildingId).select(
      "_id isActive",
    );

    if (session) {
      buildingQuery = buildingQuery.session(session);
    }

    const building = await buildingQuery;

    if (!building) {
      throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
    }

    if (building.isActive === false) {
      throw new AppError("Building is inactive", 422, "BUILDING_INACTIVE");
    }
  }

  const [pendingPost] = await PendingPost.create(
    [record],
    session ? { session } : undefined,
  );

  return pendingPost;
};
