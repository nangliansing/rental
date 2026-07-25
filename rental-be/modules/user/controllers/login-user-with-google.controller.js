import { setRefreshTokenCookie } from "../../../shared/auth/index.js";
import { loginUserWithGoogleService } from "../services/index.js";

export const loginUserWithGoogleController = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken, isNewUser } =
      await loginUserWithGoogleService(req.body);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
        isNewUser,
      },
    });
  } catch (error) {
    return next(error);
  }
};
