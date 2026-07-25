import { adminUpdateReportStatusService } from "../services/index.js";

export const adminUpdateReportStatusController = async (req, res, next) => {
  try {
    const report = await adminUpdateReportStatusService({
      reportId: req.params.reportId,
      actorId: req.user.id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};
