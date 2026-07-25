import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../auth/index.js";

export const authenticate = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError("Access token is required", 401, "ACCESS_TOKEN_REQUIRED");
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      throw new AppError("Access token is required", 401, "ACCESS_TOKEN_REQUIRED");
    }

    const payload = verifyAccessToken(token);

    if (!payload?.sub || !payload?.role) {
      throw new AppError(
        "Invalid or expired access token",
        401,
        "INVALID_ACCESS_TOKEN"
      );
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
