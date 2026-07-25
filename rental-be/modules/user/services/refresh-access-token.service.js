import mongoose from "mongoose";

import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  verifyRefreshToken,
  signAccessToken,
} from "../../../shared/auth/index.js";
import { assertActiveUser } from "../utils/index.js";
import User from "../user.model.js";

const throwInvalidRefreshToken = () => {
  throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
};

export const refreshAccessTokenService = async (refreshToken, session = null) => {
  validateNullableObject(session, "session");

  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      401,
      "REFRESH_TOKEN_REQUIRED"
    );
  }

  const payload = verifyRefreshToken(refreshToken);

  if (!mongoose.isValidObjectId(payload.sub)) {
    throwInvalidRefreshToken();
  }

  let query = User.findById(payload.sub).select("_id role status");

  if (session) {
    query = query.session(session);
  }

  const user = await query;

  if (!user) {
    throwInvalidRefreshToken();
  }

  assertActiveUser(user);

  const accessToken = signAccessToken(user);

  return { accessToken };
};
