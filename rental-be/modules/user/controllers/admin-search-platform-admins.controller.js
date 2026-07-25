import { adminSearchPlatformAdminsService } from "../services/index.js";

export const adminSearchPlatformAdminsController = async (req, res, next) => {
  try {
    const result = await adminSearchPlatformAdminsService(
      req.query,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
