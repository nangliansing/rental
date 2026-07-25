import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import BuildingEditRequest from "../building-edit-request.model.js";
import { validateBuildingEditRequestId } from "../building-edit-request.validation.js";
import { buildAdminBuildingEditRequestDetailPipeline } from "../utils/index.js";

export const adminGetBuildingEditRequestByIdService = async (
  buildingEditRequestIdInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const buildingEditRequestId = validateBuildingEditRequestId(
    buildingEditRequestIdInput,
  );

  const pipeline =
    buildAdminBuildingEditRequestDetailPipeline(buildingEditRequestId);

  let query = BuildingEditRequest.aggregate(pipeline);

  if (session) {
    query = query.session(session);
  }

  const [buildingEditRequest] = await query;

  if (!buildingEditRequest) {
    throw new AppError(
      "Building edit request not found",
      404,
      "BUILDING_EDIT_REQUEST_NOT_FOUND",
    );
  }

  return buildingEditRequest;
};
