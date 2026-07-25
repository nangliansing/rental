import { getMyNotificationsService } from "../services/index.js";

export const getMyNotificationsController = async (req, res, next) => {
  try {
    const result = await getMyNotificationsService(
      req.query,
      req.currentUser._id,
      req.dbSession,
    );

    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};
