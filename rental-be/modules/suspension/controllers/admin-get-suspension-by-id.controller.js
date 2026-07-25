import { adminGetSuspensionByIdService } from "../services/index.js";

export const adminGetSuspensionByIdController = async (req, res, next) => {
  try {
    const suspension = await adminGetSuspensionByIdService(
      req.params.suspensionId,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: suspension,
    });
  } catch (error) {
    return next(error);
  }
};
