import { adminSearchReviewReportsService } from "../services/index.js";

export const adminSearchReviewReportsController = async (req, res, next) => {
  try {
    const result = await adminSearchReviewReportsService(
      req.query,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.reviewReports,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
