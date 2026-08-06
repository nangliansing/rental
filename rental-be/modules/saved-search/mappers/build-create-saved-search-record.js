import { validateMongooseId } from "../../../shared/validators/index.js";

import { SAVED_SEARCH_STATUSES } from "../saved-search.constants.js";
import { validateCreateSavedSearchBody } from "../saved-search.validation.js";

export const buildCreateSavedSearchRecord = (body, actorId) => {
  const { name, description, geoSearch, filters } =
    validateCreateSavedSearchBody(body);

  return {
    createdBy: validateMongooseId(actorId, "createdBy", {
      asObjectId: true,
    }),
    name,
    description,
    status: SAVED_SEARCH_STATUSES.WAITING,
    geoSearch,
    filters,
    isDeleted: false,
    deletedAt: null,
  };
};