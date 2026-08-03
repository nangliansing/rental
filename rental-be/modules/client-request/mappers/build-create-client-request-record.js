import { validateMongooseId } from "../../../shared/validators/index.js";

import { CLIENT_REQUEST_STATUSES } from "../client-request.constants.js";
import { validateCreateClientRequestBody } from "../client-request.validation.js";

export const buildCreateClientRequestRecord = (body, actorId) => {
  const { name, description, geoSearch, filters } =
    validateCreateClientRequestBody(body);

  return {
    createdBy: validateMongooseId(actorId, "createdBy", {
      asObjectId: true,
    }),
    name,
    description,
    status: CLIENT_REQUEST_STATUSES.WAITING,
    geoSearch,
    filters,
    isDeleted: false,
    deletedAt: null,
  };
};