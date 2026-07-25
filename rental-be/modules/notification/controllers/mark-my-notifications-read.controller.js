import { markMyNotificationsReadService } from "../services/index.js";

export const markMyNotificationsReadController = async (req, res, next) => {
  try {
    const result = await markMyNotificationsReadService(
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
