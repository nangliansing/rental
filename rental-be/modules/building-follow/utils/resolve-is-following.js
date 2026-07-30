import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import BuildingFollow from "../building-follow.model.js";
import { applyOptionalSession } from "./building-follow-query.helpers.js";

const normalizeViewerUserId = (viewerUserId) => {
  if (!viewerUserId) {
    return null;
  }

  return validateMongooseId(viewerUserId, "viewerUserId", {
    asObjectId: true,
  });
};

const normalizeBuildingId = (buildingId) => {
  if (!buildingId) {
    return null;
  }

  return validateMongooseId(buildingId, "buildingId", {
    asObjectId: true,
  });
};

export const resolveIsFollowing = async ({
  viewerUserId = null,
  buildingId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const normalizedViewerUserId = normalizeViewerUserId(viewerUserId);
  const normalizedBuildingId = normalizeBuildingId(buildingId);

  if (!normalizedViewerUserId || !normalizedBuildingId) {
    return false;
  }

  const query = BuildingFollow.exists({
    userId: normalizedViewerUserId,
    buildingId: normalizedBuildingId,
  });

  return Boolean(await applyOptionalSession(query, session));
};

export const attachIsFollowingToBuilding = async ({
  building,
  viewerUserId = null,
  session = null,
}) => {
  if (!building) {
    return building;
  }

  const isFollowing = await resolveIsFollowing({
    viewerUserId,
    buildingId: building._id,
    session,
  });

  return {
    ...building,
    isFollowing,
  };
};
