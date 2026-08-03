import { validateNullableObject } from "../../../shared/validators/index.js";

import { buildCreateClientRequestRecord } from "../mappers/index.js";
import ClientRequest from "../client-request.model.js";

export const createClientRequestService = async (
  body,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const record = buildCreateClientRequestRecord(body, actorId);

  const [clientRequest] = await ClientRequest.create(
    [record],
    session ? { session } : undefined,
  );

  return clientRequest;
};
