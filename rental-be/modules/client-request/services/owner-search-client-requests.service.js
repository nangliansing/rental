import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateLimit,
  validateMongooseId,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import { CLIENT_REQUEST_STATUSES } from "../client-request.constants.js";
import { validateClientRequestStatus } from "../client-request.validation.js";
import ClientRequest from "../client-request.model.js";
import { buildOwnerSearchClientRequestsPipeline } from "../pipelines/index.js";
import { buildOwnerClientRequestListMatch } from "../utils/index.js";

export const ownerSearchClientRequestsService = async ({
  queryInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const query = validateObject(queryInput, "query");

  const createdBy = validateMongooseId(actorId, "createdBy", {
    asObjectId: true,
  });
  const page = validatePage(query.page);
  const limit = validateLimit(query.limit);
  const skip = (page - 1) * limit;
  const status =
    validateClientRequestStatus(query.status) ??
    CLIENT_REQUEST_STATUSES.WAITING;

  const match = buildOwnerClientRequestListMatch({
    actorId: createdBy,
    status,
  });

  const pipeline = buildOwnerSearchClientRequestsPipeline({
    match,
    page,
    skip,
    limit,
  });

  let clientRequestsQuery = ClientRequest.aggregate(pipeline);

  if (session) {
    clientRequestsQuery = clientRequestsQuery.session(session);
  }

  const [result] = await clientRequestsQuery;

  return {
    clientRequests: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
