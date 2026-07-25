import { adminGetReviewReportByIdService } from "../services/index.js";

export const adminGetReviewReportByIdController = async (req, res, next) => {
  try {
    const reviewReport = await adminGetReviewReportByIdService(
      req.params.reviewReportId,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: reviewReport,
    });
  } catch (error) {
    return next(error);
  }
};
