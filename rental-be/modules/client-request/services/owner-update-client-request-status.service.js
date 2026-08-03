import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { CLIENT_REQUEST_STATUSES } from "../client-request.constants.js";
import { validateOwnerUpdateClientRequestStatusBody } from "../client-request.validation.js";
import ClientRequest from "../client-request.model.js";
import {
  buildOwnerClientRequestFilter,
  throwClientRequestClosed,
  throwClientRequestNotFound,
} from "../utils/index.js";

export const ownerUpdateClientRequestStatusService = async ({
  clientRequestId,
  body,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedClientRequestId = validateMongooseId(
    clientRequestId,
    "clientRequestId",
  );
  const validatedActorId = validateMongooseId(actorId, "actorId");
  const { status } = validateOwnerUpdateClientRequestStatusBody(body);

  const ownerFilter = buildOwnerClientRequestFilter({
    clientRequestId: validatedClientRequestId,
    actorId: validatedActorId,
  });

  const updateFilter = {
    ...ownerFilter,
    status: CLIENT_REQUEST_STATUSES.WAITING,
  };

  let updateQuery = ClientRequest.findOneAndUpdate(
    updateFilter,
    {
      $set: {
        status,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  const clientRequest = await updateQuery;

  if (!clientRequest) {
    let raceQuery = ClientRequest.findOne(ownerFilter);

    if (session) {
      raceQuery = raceQuery.session(session);
    }

    const racedClientRequest = await raceQuery;

    if (racedClientRequest?.status === CLIENT_REQUEST_STATUSES.CLOSED) {
      throwClientRequestClosed();
    }

    throwClientRequestNotFound();
  }

  return clientRequest;
};
