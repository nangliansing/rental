import { adminGetUserByIdService } from "../services/index.js";

export const adminGetUserByIdController = async (req, res, next) => {
  try {
    const user = await adminGetUserByIdService(
      req.params.userId,
      req.dbSession
    );

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};
