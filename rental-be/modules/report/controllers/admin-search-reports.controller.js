import { adminSearchReportsService } from "../services/index.js";

export const adminSearchReportsController = async (req, res, next) => {
  try {
    const result = await adminSearchReportsService(req.query, req.dbSession);

    return res.status(200).json({
      success: true,
      data: result.reports,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
