import jwt from "jsonwebtoken";
import { getEnvironment } from "../../config/index.js";
import { AppError } from "../errors/app-error.js";

export const signAccessToken = (user) => {
  const { accessExpiresIn, accessSecret } = getEnvironment().jwt;

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    accessSecret,
    {
      expiresIn: accessExpiresIn,
    }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getEnvironment().jwt.accessSecret);
  } catch {
    throw new AppError(
      "Invalid or expired access token",
      401,
      "INVALID_ACCESS_TOKEN"
    );
  }
};
