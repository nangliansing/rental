import { adminGetReportByIdService } from "../services/index.js";

export const adminGetReportByIdController = async (req, res, next) => {
  try {
    const report = await adminGetReportByIdService(
      req.params.reportId,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};
