import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Suspension from "../suspension.model.js";
import { validateSuspensionId } from "../suspension.validation.js";
import { buildAdminSuspensionDetailPipeline } from "../utils/admin-suspension-aggregation.js";

export const adminGetSuspensionByIdService = async (
  suspensionIdInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const suspensionId = validateSuspensionId(suspensionIdInput);

  const pipeline = buildAdminSuspensionDetailPipeline(suspensionId);

  let suspensionQuery = Suspension.aggregate(pipeline);

  if (session) {
    suspensionQuery = suspensionQuery.session(session);
  }

  const [suspension] = await suspensionQuery;

  if (!suspension) {
    throw new AppError(
      "Suspension not found",
      404,
      "SUSPENSION_NOT_FOUND",
    );
  }

  return suspension;
};
