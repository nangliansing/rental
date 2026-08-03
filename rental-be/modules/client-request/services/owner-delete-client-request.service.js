import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import ClientRequest from "../client-request.model.js";
import {
  buildOwnerClientRequestFilter,
  throwClientRequestNotFound,
} from "../utils/index.js";

export const ownerDeleteClientRequestService = async ({
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
  const deletedAt = new Date();

  const ownerFilter = buildOwnerClientRequestFilter({
    clientRequestId: validatedClientRequestId,
    actorId: validatedActorId,
  });

  let deleteQuery = ClientRequest.findOneAndUpdate(
    ownerFilter,
    {
      $set: {
        isDeleted: true,
        deletedAt,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (session) {
    deleteQuery = deleteQuery.session(session);
  }

  const clientRequest = await deleteQuery;

  if (!clientRequest) {
    throwClientRequestNotFound();
  }

  return clientRequest;
};
