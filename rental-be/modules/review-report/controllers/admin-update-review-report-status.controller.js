import { adminUpdateReviewReportStatusService } from "../services/index.js";

export const adminUpdateReviewReportStatusController = async (
  req,
  res,
  next,
) => {
  try {
    const reviewReport = await adminUpdateReviewReportStatusService({
      reviewReportId: req.params.reviewReportId,
      actorId: req.user.id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: reviewReport,
    });
  } catch (error) {
    return next(error);
  }
};
