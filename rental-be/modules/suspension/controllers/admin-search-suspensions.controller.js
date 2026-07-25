import { adminSearchSuspensionsService } from "../services/index.js";

export const adminSearchSuspensionsController = async (req, res, next) => {
  try {
    const result = await adminSearchSuspensionsService(
      req.query,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.suspensions,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
