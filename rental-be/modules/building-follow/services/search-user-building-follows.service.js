import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import User from "../../user/user.model.js";
import { assertActiveUser } from "../../user/utils/index.js";

import {
  buildActiveBuildingFollowingLookupStages,
  buildPaginatedBuildingFollowSearchPipeline,
} from "../pipelines/index.js";
import {
  buildSearchBuildingFollowsParams,
  validateBuildingFollowUserId,
} from "../building-follow.validation.js";
import { applyOptionalSession, executeBuildingFollowSearch } from "../utils/index.js";

const ACTIVE_USER_SELECT = "_id status";

export const searchUserBuildingFollowsService = async ({
  userId: userIdInput,
  actorId,
  queryInput = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateBuildingFollowUserId(userIdInput);
  const actorObjectId = validateMongooseId(actorId, "userId", {
    asObjectId: true,
  });
  const params = buildSearchBuildingFollowsParams(queryInput);

  if (!userId.equals(actorObjectId)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const userQuery = User.findById(userId).select(ACTIVE_USER_SELECT).lean();
  const user = await applyOptionalSession(userQuery, session);

  assertActiveUser(user);

  const pipeline = buildPaginatedBuildingFollowSearchPipeline({
    match: { userId },
    page: params.page,
    limit: params.limit,
    lookupStages: buildActiveBuildingFollowingLookupStages(),
  });

  const { items, pagination } = await executeBuildingFollowSearch({
    pipeline,
    page: params.page,
    limit: params.limit,
    session,
  });

  return {
    followings: items,
    pagination,
  };
};
