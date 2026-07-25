import { createReportService } from "../services/index.js";

export const createReportController = async (req, res, next) => {
  try {
    const report = await createReportService(
      req.body,
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};
