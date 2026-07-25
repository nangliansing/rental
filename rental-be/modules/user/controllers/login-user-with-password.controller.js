// modules/user/controllers/login-user-with-password.controller.js
import { setRefreshTokenCookie } from "../../../shared/auth/index.js";
import { loginUserWithPasswordService } from "../services/index.js";

export const loginUserWithPasswordController = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } =
      await loginUserWithPasswordService(req.body);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};