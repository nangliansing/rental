import Building from "../../building/building.model.js";
import { ACTIVE_BUILDING_FILTER } from "../../building/services/building-query.constants.js";

import BuildingFollow from "../building-follow.model.js";
import { BUILDING_FOLLOW_RECORD_SELECT } from "../building-follow.constants.js";

const FOLLOWABLE_BUILDING_SELECT = "_id";

export const applyOptionalSession = (query, session) => {
  return session ? query.session(session) : query;
};

export const findExistingBuildingFollow = ({ userId, buildingId, session }) => {
  const query = BuildingFollow.findOne({
    userId,
    buildingId,
  })
    .select(BUILDING_FOLLOW_RECORD_SELECT)
    .lean();

  return applyOptionalSession(query, session);
};

export const findFollowableBuilding = ({ buildingId, session }) => {
  const query = Building.findOne({
    _id: buildingId,
    ...ACTIVE_BUILDING_FILTER,
  })
    .select(FOLLOWABLE_BUILDING_SELECT)
    .lean();

  return applyOptionalSession(query, session);
};

export const isDuplicateBuildingFollowError = (error) => {
  return error?.code === 11000;
};
