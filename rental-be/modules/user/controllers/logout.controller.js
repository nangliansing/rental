// modules/user/controllers/logout.controller.js
import { clearRefreshTokenCookie } from "../../../shared/auth/index.js";

export const logoutController = async (req, res, next) => {
  try {
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};