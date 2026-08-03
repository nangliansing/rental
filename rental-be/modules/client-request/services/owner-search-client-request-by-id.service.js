import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import ClientRequest from "../client-request.model.js";
import {
  buildOwnerClientRequestFilter,
  throwClientRequestNotFound,
} from "../utils/index.js";

export const ownerSearchClientRequestByIdService = async ({
  clientRequestId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedClientRequestId = validateMongooseId(
    clientRequestId,
    "clientRequestId",
  );
  const validatedActorId = validateMongooseId(actorId, "actorId");

  const ownerFilter = buildOwnerClientRequestFilter({
    clientRequestId: validatedClientRequestId,
    actorId: validatedActorId,
  });

  let clientRequestQuery = ClientRequest.findOne(ownerFilter);

  if (session) {
    clientRequestQuery = clientRequestQuery.session(session);
  }

  const clientRequest = await clientRequestQuery;

  if (!clientRequest) {
    throwClientRequestNotFound();
  }

  return clientRequest;
};
