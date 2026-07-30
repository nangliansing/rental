import {
  validateLimit,
  validateMongooseId,
  validateObject,
  validatePage,
} from "../../shared/validators/index.js";

export const validateBuildingFollowBuildingId = (input) => {
  return validateMongooseId(input, "buildingId", {
    asObjectId: true,
  });
};

export const validateBuildingFollowUserId = (input) => {
  return validateMongooseId(input, "userId", {
    asObjectId: true,
  });
};

export const buildSearchBuildingFollowsParams = (queryInput = {}) => {
  validateObject(queryInput, "query");

  return {
    page: validatePage(queryInput.page),
    limit: validateLimit(queryInput.limit),
  };
};
