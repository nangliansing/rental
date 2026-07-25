import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import User from "../user.model.js";
import { validateUserId } from "../user.validation.js";
import { buildAdminUserDetailPipeline } from "../utils/index.js";

export const adminGetUserByIdService = async (userIdInput, session = null) => {
  validateNullableObject(session, "session");

  const userId = validateUserId(userIdInput);
  let query = User.aggregate(buildAdminUserDetailPipeline(userId));

  if (session) {
    query = query.session(session);
  }

  const [user] = await query;

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
};
