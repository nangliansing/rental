import { createReviewReportService } from "../services/index.js";

export const createReviewReportController = async (req, res, next) => {
  try {
    const reviewReport = await createReviewReportService(
      req.body,
      req.user.id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: reviewReport,
    });
  } catch (error) {
    return next(error);
  }
};
