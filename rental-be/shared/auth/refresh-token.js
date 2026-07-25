import jwt from "jsonwebtoken";
import { getEnvironment } from "../../config/index.js";
import { AppError } from "../errors/app-error.js";

const REFRESH_TOKEN_EXPIRES_IN = "3d";
const REFRESH_TOKEN_COOKIE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const getRefreshTokenCookieOptions = () => {
  const { domain, sameSite, secure } = getEnvironment().cookie;

  return {
    httpOnly: true,
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };
};

export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenType: "refresh",
    },
    getEnvironment().jwt.refreshSecret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

export const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, getEnvironment().jwt.refreshSecret);

    if (payload.tokenType !== "refresh") {
      throw new Error();
    }

    return payload;
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_REFRESH_TOKEN"
    );
  }
};

export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...getRefreshTokenCookieOptions(),
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshTokenCookieOptions());
};
