import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";

import Building from "../../building/building.model.js";
import Listing from "../../listing/listing.model.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import Report from "../report.model.js";
import { REPORT_STATUSES, REPORT_TARGET_TYPES } from "../report.constants.js";
import {
  validateAdminUpdateReportStatusBody,
  validateReportId,
} from "../report.validation.js";
import { adminGetReportByIdService } from "./admin-get-report-by-id.service.js";

const getPublicReviewReason = (reviewNote) => {
  if (!reviewNote) return null;

  const [firstLine] = reviewNote
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return firstLine || null;
};

const buildReportSubject = ({ building }) => {
  const buildingName = building?.name?.trim();

  if (buildingName) {
    return ` for ${buildingName}`;
  }

  return "";
};

const buildPublicNoteSentence = (publicReason, label = "Note") => {
  if (!publicReason) return "";

  const punctuation = /[.!?]$/.test(publicReason) ? "" : ".";

  return ` ${label}: ${publicReason}${punctuation}`;
};

const buildReportNotificationContent = ({ status, subject, publicReason }) => {
  const noteText = buildPublicNoteSentence(publicReason);
  const actionText = buildPublicNoteSentence(publicReason, "Action");

  const contentByStatus = {
    [REPORT_STATUSES.REVIEWED]: {
      type: NOTIFICATION_TYPES.REPORT_REVIEWED,
      title: "Report reviewed",
      message: `We reviewed your listing report${subject}.${noteText} Thanks for helping keep listings accurate.`,
    },
    [REPORT_STATUSES.DISMISSED]: {
      type: NOTIFICATION_TYPES.REPORT_DISMISSED,
      title: "Report dismissed",
      message: `We reviewed your listing report${subject} and did not find a platform issue.${noteText} Thanks for helping keep listings accurate.`,
    },
    [REPORT_STATUSES.ACTION_TAKEN]: {
      type: NOTIFICATION_TYPES.REPORT_ACTION_TAKEN,
      title: "Action taken on report",
      message: `We reviewed your listing report${subject} and took action.${actionText} Thanks for helping keep listings accurate.`,
    },
  };

  return contentByStatus[status];
};

const buildReportNotification = ({
  report,
  listing,
  building,
  reviewedBy,
  status,
  reviewNote,
}) => {
  const publicReason = getPublicReviewReason(reviewNote);
  const subject = buildReportSubject({ building });
  const content = buildReportNotificationContent({
    status,
    subject,
    publicReason,
  });

  return {
    recipient: report.reportedBy,
    actor: reviewedBy,
    type: content.type,
    title: content.title,
    message: content.message,
    entityType: NOTIFICATION_ENTITY_TYPES.REPORT,
    entityId: report._id,
    link: null,
    metadata: {
      reportId: report._id.toString(),
      listingId: report.listingId.toString(),
      buildingId: listing?.buildingId?.toString() ?? null,
      reason: publicReason,
    },
  };
};

const findReportOrThrow = async (reportId, session) => {
  const report = await Report.findOne({
    _id: reportId,
    targetType: REPORT_TARGET_TYPES.LISTING,
  }).session(session);

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND");
  }

  if (report.status !== REPORT_STATUSES.OPEN) {
    throw new AppError(
      "Only open reports can be reviewed",
      422,
      "REPORT_NOT_OPEN",
    );
  }

  return report;
};

const loadReportNotificationContext = async (report, session) => {
  const listing = await Listing.findById(report.listingId)
    .select("buildingId")
    .session(session)
    .lean();
  const building = listing?.buildingId
    ? await Building.findById(listing.buildingId)
        .select("name")
        .session(session)
        .lean()
    : null;

  return { listing, building };
};

const updateReportStatus = async ({
  reportId,
  reviewedBy,
  status,
  reviewNote,
  session,
}) => {
  const report = await findReportOrThrow(reportId, session);
  const reviewedAt = new Date();

  const updatedReport = await Report.findOneAndUpdate(
    {
      _id: report._id,
      targetType: REPORT_TARGET_TYPES.LISTING,
      status: REPORT_STATUSES.OPEN,
    },
    {
      $set: {
        status,
        reviewedBy,
        reviewedAt,
        reviewNote: reviewNote ?? null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!updatedReport) {
    throw new AppError(
      "Only open reports can be reviewed",
      422,
      "REPORT_NOT_OPEN",
    );
  }

  const { listing, building } = await loadReportNotificationContext(
    report,
    session,
  );
  const notificationPayload = buildReportNotification({
    report,
    listing,
    building,
    reviewedBy,
    status,
    reviewNote,
  });
  const notification = await createAndEmitNotification(notificationPayload, {
    session,
    emit: false,
  });

  return {
    report: updatedReport,
    notification,
  };
};

export const adminUpdateReportStatusService = async ({
  reportId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedReportId = validateReportId(reportId);
  const reviewedBy = validateMongooseId(actorId, "reviewedBy");
  const { status, reviewNote } = validateAdminUpdateReportStatusBody(body);

  if (session) {
    const { report, notification } = await updateReportStatus({
      reportId: validatedReportId,
      reviewedBy,
      status,
      reviewNote,
      session,
    });

    if (notification && !session.inTransaction?.()) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return adminGetReportByIdService(report._id, session);
  }

  const transactionSession = await mongoose.startSession();

  try {
    let updatedReport;
    let notification;

    await transactionSession.withTransaction(async () => {
      const result = await updateReportStatus({
        reportId: validatedReportId,
        reviewedBy,
        status,
        reviewNote,
        session: transactionSession,
      });

      updatedReport = result.report;
      notification = result.notification;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return adminGetReportByIdService(updatedReport._id);
  } finally {
    await transactionSession.endSession();
  }
};
