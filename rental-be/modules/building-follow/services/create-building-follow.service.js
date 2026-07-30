import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import BuildingFollow from "../building-follow.model.js";
import { BUILDING_FOLLOW_ERROR_CODES } from "../building-follow.constants.js";
import { validateBuildingFollowBuildingId } from "../building-follow.validation.js";
import { buildCreateBuildingFollowRecord } from "../mappers/index.js";
import {
  findExistingBuildingFollow,
  findFollowableBuilding,
  isDuplicateBuildingFollowError,
} from "../utils/index.js";

const throwBuildingAlreadyFollowed = () => {
  throw new AppError(
    "Building is already followed",
    409,
    BUILDING_FOLLOW_ERROR_CODES.ALREADY_FOLLOWED,
  );
};

export const createBuildingFollowService = async ({
  buildingId: buildingIdInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId", { asObjectId: true });
  const buildingId = validateBuildingFollowBuildingId(buildingIdInput);

  const existingFollow = await findExistingBuildingFollow({
    userId,
    buildingId,
    session,
  });

  if (existingFollow) {
    throwBuildingAlreadyFollowed();
  }

  const building = await findFollowableBuilding({ buildingId, session });

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  try {
    const [buildingFollow] = await BuildingFollow.create(
      [
        buildCreateBuildingFollowRecord({
          userId,
          buildingId,
        }),
      ],
      session ? { session } : undefined,
    );

    return buildingFollow;
  } catch (error) {
    if (isDuplicateBuildingFollowError(error)) {
      throwBuildingAlreadyFollowed();
    }

    throw error;
  }
};
