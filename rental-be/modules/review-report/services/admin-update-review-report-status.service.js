import mongoose from "mongoose";

import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import User from "../../user/user.model.js";
import ReviewReport from "../review-report.model.js";
import { REVIEW_REPORT_STATUSES } from "../review-report.constants.js";
import {
  validateAdminUpdateReviewReportStatusBody,
  validateReviewReportId,
} from "../review-report.validation.js";
import { adminGetReviewReportByIdService } from "./admin-get-review-report-by-id.service.js";

const getPublicReviewNote = (reviewNote) => {
  if (!reviewNote) return null;

  const [firstLine] = reviewNote
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return firstLine || null;
};

const buildReviewLabel = ({ reviewOwner, listerProfile, recipientId }) => {
  const reviewerName = reviewOwner?.name?.trim();
  const listerName = listerProfile?.displayName?.trim();
  const isRecipientLister =
    recipientId &&
    listerProfile?.userId &&
    listerProfile.userId.toString() === recipientId.toString();
  const profileLabel = isRecipientLister
    ? "your profile"
    : listerName
      ? `${listerName} profile`
      : "this profile";

  if (reviewerName) return `${reviewerName}'s review on ${profileLabel}`;

  if (listerName || isRecipientLister) return `a review on ${profileLabel}`;

  return "a review";
};

const buildPublicNoteSentence = (publicNote, label = "Note") => {
  if (!publicNote) return "";

  const punctuation = /[.!?]$/.test(publicNote) ? "" : ".";

  return ` ${label}: ${publicNote}${punctuation}`;
};

const buildNotificationContent = ({ status, reviewLabel, publicNote }) => {
  const noteText = buildPublicNoteSentence(publicNote);
  const actionText = buildPublicNoteSentence(publicNote, "Action");

  const contentByStatus = {
    [REVIEW_REPORT_STATUSES.REVIEWED]: {
      type: NOTIFICATION_TYPES.REPORT_REVIEWED,
      title: "Review report reviewed",
      message: `We reviewed your report about ${reviewLabel}.${noteText} Thank you for helping keep reviews trustworthy.`,
    },
    [REVIEW_REPORT_STATUSES.DISMISSED]: {
      type: NOTIFICATION_TYPES.REPORT_DISMISSED,
      title: "Review report dismissed",
      message: `We reviewed your report about ${reviewLabel} and did not find a policy issue.${noteText} Thank you for helping keep reviews trustworthy.`,
    },
    [REVIEW_REPORT_STATUSES.ACTION_TAKEN]: {
      type: NOTIFICATION_TYPES.REPORT_ACTION_TAKEN,
      title: "Action taken on review report",
      message: `We reviewed your report about ${reviewLabel} and took action.${actionText} Thank you for helping keep reviews trustworthy.`,
    },
  };

  return contentByStatus[status];
};

const buildReviewReportNotification = ({
  report,
  reviewedBy,
  status,
  reviewNote,
  reviewOwner,
  listerProfile,
}) => {
  const publicNote = getPublicReviewNote(reviewNote);
  const reviewLabel = buildReviewLabel({
    reviewOwner,
    listerProfile,
    recipientId: report.reportedBy,
  });
  const content = buildNotificationContent({
    status,
    reviewLabel,
    publicNote,
  });

  return {
    recipient: report.reportedBy,
    actor: reviewedBy,
    type: content.type,
    title: content.title,
    message: content.message,
    entityType: NOTIFICATION_ENTITY_TYPES.REVIEW,
    entityId: report.reviewId,
    link: `/listers/${report.listerProfileId}`,
    metadata: {
      reviewReportId: report._id.toString(),
      reviewId: report.reviewId.toString(),
      listerProfileId: report.listerProfileId.toString(),
      reviewOwnerId: report.reviewOwnerId.toString(),
      reason: publicNote,
    },
  };
};

const buildReviewReportStatusUpdate = ({
  reviewedBy,
  status,
  reviewNote,
  reviewedAt,
}) => {
  const update = {
    status,
    reviewedBy,
    reviewedAt,
    reviewNote: reviewNote ?? null,
    actionTakenBy: null,
    actionTakenAt: null,
    actionReason: null,
  };

  if (status === REVIEW_REPORT_STATUSES.ACTION_TAKEN) {
    update.actionTakenBy = reviewedBy;
    update.actionTakenAt = reviewedAt;
    update.actionReason = reviewNote;
  }

  return update;
};

const loadReviewReportNotificationContext = async (reviewReport, session) => {
  const [reviewOwner, listerProfile] = await Promise.all([
    User.findById(reviewReport.reviewOwnerId)
      .select("name")
      .session(session)
      .lean(),
    AgentProfile.findById(reviewReport.listerProfileId)
      .select("userId displayName")
      .session(session)
      .lean(),
  ]);

  return { reviewOwner, listerProfile };
};

const findOpenReviewReportOrThrow = async (reviewReportId, session) => {
  const reviewReport = await ReviewReport.findOne({
    _id: reviewReportId,
    isDeleted: false,
  }).session(session);

  if (!reviewReport) {
    throw new AppError(
      "Review report not found",
      404,
      "REVIEW_REPORT_NOT_FOUND",
    );
  }

  if (reviewReport.status !== REVIEW_REPORT_STATUSES.OPEN) {
    throw new AppError(
      "Only open review reports can be reviewed",
      422,
      "REVIEW_REPORT_NOT_OPEN",
    );
  }

  return reviewReport;
};

const updateReviewReportStatus = async ({
  reviewReportId,
  reviewedBy,
  status,
  reviewNote,
  session,
}) => {
  const reviewReport = await findOpenReviewReportOrThrow(
    reviewReportId,
    session,
  );
  const reviewedAt = new Date();
  const update = buildReviewReportStatusUpdate({
    reviewedBy,
    status,
    reviewNote,
    reviewedAt,
  });

  const updatedReviewReport = await ReviewReport.findOneAndUpdate(
    {
      _id: reviewReport._id,
      isDeleted: false,
      status: REVIEW_REPORT_STATUSES.OPEN,
    },
    { $set: update },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    },
  );

  if (!updatedReviewReport) {
    throw new AppError(
      "Only open review reports can be reviewed",
      422,
      "REVIEW_REPORT_NOT_OPEN",
    );
  }

  const { reviewOwner, listerProfile } =
    await loadReviewReportNotificationContext(reviewReport, session);
  const notification = await createAndEmitNotification(
    buildReviewReportNotification({
      report: reviewReport,
      reviewedBy,
      status,
      reviewNote,
      reviewOwner,
      listerProfile,
    }),
    {
      session,
      emit: false,
    },
  );

  return {
    reviewReport: updatedReviewReport,
    notification,
  };
};

export const adminUpdateReviewReportStatusService = async ({
  reviewReportId,
  actorId,
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedReviewReportId = validateReviewReportId(reviewReportId);
  const reviewedBy = validateMongooseId(actorId, "reviewedBy");
  const { status, reviewNote } =
    validateAdminUpdateReviewReportStatusBody(body);

  if (session) {
    const { reviewReport, notification } = await updateReviewReportStatus({
      reviewReportId: validatedReviewReportId,
      reviewedBy,
      status,
      reviewNote,
      session,
    });

    if (notification && !session.inTransaction?.()) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return adminGetReviewReportByIdService(reviewReport._id, session);
  }

  const transactionSession = await mongoose.startSession();

  try {
    let updatedReviewReport;
    let notification;

    await transactionSession.withTransaction(async () => {
      const result = await updateReviewReportStatus({
        reviewReportId: validatedReviewReportId,
        reviewedBy,
        status,
        reviewNote,
        session: transactionSession,
      });

      updatedReviewReport = result.reviewReport;
      notification = result.notification;
    });

    if (notification) {
      emitNotificationToUser(notification.recipient.toString(), notification);
    }

    return adminGetReviewReportByIdService(updatedReviewReport._id);
  } finally {
    await transactionSession.endSession();
  }
};
