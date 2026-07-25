import {
  validateMongooseId,
  validateObject,
  validateOptionalString,
} from "../../../shared/validators/index.js";
import { buildCreateBuildingRecord } from "../../building/mappers/index.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "../building-edit-request.constants.js";

const pickBuildingDetails = (building) => ({
  name: building.name,
  buildingType: building.buildingType,
  facilities: building.facilities,
  security: building.security,
  location: building.location,
  address: building.address,
});

export const buildCreateBuildingEditRequestRecord = (body, actorId) => {
  validateObject(body, "body");

  const requestedBy = validateMongooseId(actorId, "requestedBy");
  const buildingId = validateMongooseId(body.buildingId, "buildingId");
  const proposedBuildingRecord = buildCreateBuildingRecord(
    body.proposedBuilding,
    requestedBy,
  );

  return {
    status: BUILDING_EDIT_REQUEST_STATUSES.PENDING,
    buildingId,
    requestedBy,
    requestReason: validateOptionalString(
      body.requestReason,
      "requestReason",
      1000,
    ),
    originalBuilding: null,
    proposedBuilding: pickBuildingDetails(proposedBuildingRecord),
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
  };
};
