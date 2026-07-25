import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { BUILDING_EDIT_REQUEST_STATUSES } from "../building-edit-request.constants.js";
import {
  validateBuildingEditRequestId,
  validateRejectBuildingEditRequestBody,
} from "../building-edit-request.validation.js";
import {
  getAdminBuildingEditRequestReviewResponse,
  getPendingBuildingEditRequestForReview,
  markBuildingEditRequestReviewed,
  runBuildingEditRequestReviewTransaction,
} from "./admin-building-edit-request-review.helpers.js";

const buildBuildingEditRejectedNotification = ({
  buildingEditRequest,
  reviewedBy,
  reviewReason,
}) => {
  return {
    recipient: buildingEditRequest.requestedBy,
    actor: reviewedBy,
    type: NOTIFICATION_TYPES.BUILDING_EDIT_REJECTED,
    title: "Building edit not approved",
    message: `We could not approve your building edit request. Reason: ${reviewReason}`,
    entityType: NOTIFICATION_ENTITY_TYPES.BUILDING_EDIT_REQUEST,
    entityId: buildingEditRequest._id,
    link: `/buildings/${buildingEditRequest.buildingId.toString()}/edit`,
    metadata: {
      buildingEditRequestId: buildingEditRequest._id.toString(),
      buildingId: buildingEditRequest.buildingId.toString(),
      reviewReason,
    },
  };
};

const rejectBuildingEditRequest = async ({
  buildingEditRequestId,
  reviewedBy,
  reviewReason,
  session,
}) => {
  const buildingEditRequest = await getPendingBuildingEditRequestForReview({
    buildingEditRequestId,
    action: "rejected",
    session,
  });

  const rejectedRequest = await markBuildingEditRequestReviewed({
    buildingEditRequestId: buildingEditRequest._id,
    status: BUILDING_EDIT_REQUEST_STATUSES.REJECTED,
    reviewedBy,
    reviewReason,
    action: "rejected",
    session,
  });

  const notification = await createAndEmitNotification(
    buildBuildingEditRejectedNotification({
      buildingEditRequest,
      reviewedBy,
      reviewReason,
    }),
    { session, emit: false },
  );

  const responseRequest =
    (await getAdminBuildingEditRequestReviewResponse({
      buildingEditRequestId: rejectedRequest._id,
      session,
    })) ?? rejectedRequest;

  return {
    request: responseRequest,
    notification,
  };
};

export const adminRejectBuildingEditRequestService = async ({
  buildingEditRequestId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedBuildingEditRequestId =
    validateBuildingEditRequestId(buildingEditRequestId);
  const reviewedBy = validateMongooseId(actorId, "reviewedBy");
  const { reviewReason } = validateRejectBuildingEditRequestBody(body);

  const { request } = await runBuildingEditRequestReviewTransaction({
    session,
    execute: (reviewSession) =>
      rejectBuildingEditRequest({
        buildingEditRequestId: validatedBuildingEditRequestId,
        reviewedBy,
        reviewReason,
        session: reviewSession,
      }),
  });

  return request;
};
