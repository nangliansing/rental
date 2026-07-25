import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/app-error.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";

import { BUILDING_EDIT_REQUEST_STATUSES } from "../building-edit-request.constants.js";
import BuildingEditRequest from "../building-edit-request.model.js";
import { buildAdminBuildingEditRequestDetailPipeline } from "../utils/index.js";

export const getPendingBuildingEditRequestForReview = async ({
  buildingEditRequestId,
  action,
  session,
}) => {
  const buildingEditRequest = await BuildingEditRequest.findOne({
    _id: buildingEditRequestId,
  }).session(session);

  if (!buildingEditRequest) {
    throw new AppError(
      "Building edit request not found",
      404,
      "BUILDING_EDIT_REQUEST_NOT_FOUND",
    );
  }

  if (buildingEditRequest.status !== BUILDING_EDIT_REQUEST_STATUSES.PENDING) {
    throw new AppError(
      `Only pending building edit requests can be ${action}`,
      422,
      "BUILDING_EDIT_REQUEST_NOT_PENDING",
    );
  }

  return buildingEditRequest;
};

export const markBuildingEditRequestReviewed = async ({
  buildingEditRequestId,
  status,
  reviewedBy,
  reviewReason,
  action,
  session,
}) => {
  const buildingEditRequest = await BuildingEditRequest.findOneAndUpdate(
    {
      _id: buildingEditRequestId,
      status: BUILDING_EDIT_REQUEST_STATUSES.PENDING,
    },
    {
      $set: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewReason,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!buildingEditRequest) {
    throw new AppError(
      `Only pending building edit requests can be ${action}`,
      422,
      "BUILDING_EDIT_REQUEST_NOT_PENDING",
    );
  }

  return buildingEditRequest;
};

export const getAdminBuildingEditRequestReviewResponse = async ({
  buildingEditRequestId,
  session,
}) => {
  let query = BuildingEditRequest.aggregate(
    buildAdminBuildingEditRequestDetailPipeline(buildingEditRequestId),
  );

  if (session) {
    query = query.session(session);
  }

  const [buildingEditRequest] = await query;

  return buildingEditRequest;
};

export const emitBuildingEditReviewNotification = ({
  notification,
  session,
}) => {
  if (!notification || session?.inTransaction?.()) {
    return;
  }

  emitNotificationToUser(notification.recipient.toString(), notification);
};

export const runBuildingEditRequestReviewTransaction = async ({
  session,
  execute,
}) => {
  if (session) {
    const result = await execute(session);

    emitBuildingEditReviewNotification({
      notification: result.notification,
      session,
    });

    return result;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let result;

    await transactionSession.withTransaction(async () => {
      result = await execute(transactionSession);
    });

    emitBuildingEditReviewNotification({
      notification: result.notification,
    });

    return result;
  } finally {
    await transactionSession.endSession();
  }
};
