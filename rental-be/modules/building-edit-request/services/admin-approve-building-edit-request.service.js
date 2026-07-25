import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "../building-edit-request.constants.js";
import {
  validateBuildingEditRequestId,
  validateApproveBuildingEditRequestBody,
} from "../building-edit-request.validation.js";
import {
  getAdminBuildingEditRequestReviewResponse,
  getPendingBuildingEditRequestForReview,
  markBuildingEditRequestReviewed,
  runBuildingEditRequestReviewTransaction,
} from "./admin-building-edit-request-review.helpers.js";

const buildBuildingUpdateFromRequest = (buildingEditRequest, reviewedBy) => {
  const proposedBuilding =
    typeof buildingEditRequest.proposedBuilding?.toObject === "function"
      ? buildingEditRequest.proposedBuilding.toObject()
      : buildingEditRequest.proposedBuilding;

  if (!proposedBuilding) {
    throw new AppError(
      "Proposed building data is required",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    name: proposedBuilding.name,
    buildingType: proposedBuilding.buildingType,
    facilities: proposedBuilding.facilities ?? [],
    security: proposedBuilding.security ?? [],
    location: proposedBuilding.location,
    address: proposedBuilding.address ?? null,
    updatedBy: reviewedBy,
  };
};

const buildBuildingEditApprovedNotification = ({
  buildingEditRequest,
  building,
  reviewedBy,
  reviewReason,
}) => {
  return {
    recipient: buildingEditRequest.requestedBy,
    actor: reviewedBy,
    type: NOTIFICATION_TYPES.BUILDING_EDIT_APPROVED,
    title: "Building edit approved",
    message: `Your proposed changes for ${building.name} were approved.`,
    entityType: NOTIFICATION_ENTITY_TYPES.BUILDING_EDIT_REQUEST,
    entityId: buildingEditRequest._id,
    link: `/buildings/${building._id.toString()}/edit`,
    metadata: {
      buildingEditRequestId: buildingEditRequest._id.toString(),
      buildingId: building._id.toString(),
      reviewReason,
    },
  };
};

const approveBuildingEditRequest = async ({
  buildingEditRequestId,
  reviewReason,
  reviewedBy,
  session,
}) => {
  const buildingEditRequest = await getPendingBuildingEditRequestForReview({
    buildingEditRequestId,
    action: "approved",
    session,
  });

  const buildingUpdate = buildBuildingUpdateFromRequest(
    buildingEditRequest,
    reviewedBy,
  );

  const building = await Building.findOneAndUpdate(
    {
      _id: buildingEditRequest.buildingId,
      isActive: { $ne: false },
    },
    { $set: buildingUpdate },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  const approvedRequest = await markBuildingEditRequestReviewed({
    buildingEditRequestId: buildingEditRequest._id,
    status: BUILDING_EDIT_REQUEST_STATUSES.APPROVED,
    reviewedBy,
    reviewReason,
    action: "approved",
    session,
  });

  const notification = await createAndEmitNotification(
    buildBuildingEditApprovedNotification({
      buildingEditRequest,
      building,
      reviewedBy,
      reviewReason,
    }),
    { session, emit: false },
  );

  const responseRequest =
    (await getAdminBuildingEditRequestReviewResponse({
      buildingEditRequestId: approvedRequest._id,
      session,
    })) ?? approvedRequest;

  return {
    request: responseRequest,
    building,
    notification,
  };
};

export const adminApproveBuildingEditRequestService = async ({
  buildingEditRequestId,
  actorId,
  body = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedBuildingEditRequestId =
    validateBuildingEditRequestId(buildingEditRequestId);
  const reviewedBy = validateMongooseId(actorId, "reviewedBy");
  const { reviewReason } = validateApproveBuildingEditRequestBody(body);

  const result = await runBuildingEditRequestReviewTransaction({
    session,
    execute: (reviewSession) =>
      approveBuildingEditRequest({
        buildingEditRequestId: validatedBuildingEditRequestId,
        reviewReason,
        reviewedBy,
        session: reviewSession,
      }),
  });

  return {
    request: result.request,
    building: result.building,
  };
};
