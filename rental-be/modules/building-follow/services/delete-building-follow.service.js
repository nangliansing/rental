import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import BuildingFollow from "../building-follow.model.js";
import {
  BUILDING_FOLLOW_ERROR_CODES,
  BUILDING_FOLLOW_RECORD_SELECT,
} from "../building-follow.constants.js";
import { validateBuildingFollowBuildingId } from "../building-follow.validation.js";
import { applyOptionalSession } from "../utils/index.js";

const throwBuildingFollowNotFound = () => {
  throw new AppError(
    "Building follow not found",
    404,
    BUILDING_FOLLOW_ERROR_CODES.NOT_FOLLOWED,
  );
};

export const deleteBuildingFollowService = async ({
  buildingId: buildingIdInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId", { asObjectId: true });
  const buildingId = validateBuildingFollowBuildingId(buildingIdInput);

  const deleteQuery = BuildingFollow.findOneAndDelete({
    userId,
    buildingId,
  }).select(BUILDING_FOLLOW_RECORD_SELECT);

  const buildingFollow = await applyOptionalSession(deleteQuery, session);

  if (!buildingFollow) {
    throwBuildingFollowNotFound();
  }

  return buildingFollow;
};
