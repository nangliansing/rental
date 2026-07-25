import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import { buildCreateBuildingEditRequestRecord } from "../mappers/index.js";
import BuildingEditRequest from "../building-edit-request.model.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "../building-edit-request.constants.js";

const buildBuildingSnapshot = (building) => ({
  name: building.name,
  buildingType: building.buildingType,
  facilities: [...(building.facilities ?? [])],
  security: [...(building.security ?? [])],
  location: {
    type: building.location?.type,
    coordinates: [...(building.location?.coordinates ?? [])],
  },
  address: building.address ?? null,
});

const normalizeSnapshot = (snapshot) =>
  JSON.stringify({
    ...snapshot,
    facilities: [...snapshot.facilities].sort(),
    security: [...snapshot.security].sort(),
  });

const isDuplicatePendingBuildingEditRequestError = (error) => {
  return error?.code === 11000;
};

const throwPendingBuildingEditRequestExists = () => {
  throw new AppError(
    "You already have a pending edit request for this building",
    409,
    "BUILDING_EDIT_REQUEST_ALREADY_PENDING",
  );
};

export const createBuildingEditRequestService = async (
  body,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const requestedBy = validateMongooseId(actorId, "requestedBy");
  const record = buildCreateBuildingEditRequestRecord(body, requestedBy);

  let buildingQuery = Building.findById(record.buildingId);
  let pendingRequestQuery = BuildingEditRequest.exists({
    buildingId: record.buildingId,
    requestedBy,
    status: BUILDING_EDIT_REQUEST_STATUSES.PENDING,
  });

  if (session) {
    buildingQuery = buildingQuery.session(session);
    pendingRequestQuery = pendingRequestQuery.session(session);
  }

  const [building, pendingRequest] = session
    ? [await buildingQuery, await pendingRequestQuery]
    : await Promise.all([buildingQuery, pendingRequestQuery]);

  if (pendingRequest) {
    throwPendingBuildingEditRequestExists();
  }

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  if (building.isActive === false) {
    throw new AppError("Building is inactive", 422, "BUILDING_INACTIVE");
  }

  record.originalBuilding = buildBuildingSnapshot(building);

  if (
    normalizeSnapshot(record.originalBuilding) ===
    normalizeSnapshot(record.proposedBuilding)
  ) {
    throw new AppError(
      "At least one building field must be changed",
      422,
      "NO_BUILDING_CHANGES",
    );
  }

  try {
    const [buildingEditRequest] = await BuildingEditRequest.create(
      [record],
      session ? { session } : undefined,
    );

    return buildingEditRequest;
  } catch (error) {
    if (isDuplicatePendingBuildingEditRequestError(error)) {
      throwPendingBuildingEditRequestExists();
    }

    throw error;
  }
};
