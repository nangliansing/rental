import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { CLIENT_REQUEST_STATUSES } from "../client-request.constants.js";
import { buildOwnerUpdateClientRequestRecord } from "../mappers/index.js";
import ClientRequest from "../client-request.model.js";

const throwClientRequestNotFound = () => {
  throw new AppError(
    "Client request not found",
    404,
    "CLIENT_REQUEST_NOT_FOUND",
  );
};

const throwClientRequestClosed = () => {
  throw new AppError(
    "Closed client requests cannot be updated",
    409,
    "CLIENT_REQUEST_CLOSED",
  );
};

export const ownerUpdateClientRequestService = async ({
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

  const ownerFilter = {
    _id: validatedClientRequestId,
    createdBy: validatedActorId,
    isDeleted: false,
  };

  let existingQuery = ClientRequest.findOne(ownerFilter);

  if (session) {
    existingQuery = existingQuery.session(session);
  }

  const existingClientRequest = await existingQuery;

  if (!existingClientRequest) {
    throwClientRequestNotFound();
  }

  if (existingClientRequest.status === CLIENT_REQUEST_STATUSES.CLOSED) {
    throwClientRequestClosed();
  }

  const update = buildOwnerUpdateClientRequestRecord({
    body,
    clientRequest: existingClientRequest,
  });

  const updateFilter = {
    ...ownerFilter,
    status: CLIENT_REQUEST_STATUSES.WAITING,
  };

  let updateQuery = ClientRequest.findOneAndUpdate(
    updateFilter,
    { $set: update },
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
