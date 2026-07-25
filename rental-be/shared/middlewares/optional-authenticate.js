// shared/middlewares/optional-authenticate.js
import User from "../../modules/user/user.model.js";
import { USER_STATUSES } from "../../modules/user/user.constants.js";
import { verifyAccessToken } from "../auth/index.js";
import { validateMongooseId } from "../validators/index.js";

export const optionalAuthenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next();
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = validateMongooseId(payload?.sub, "userId");

    let query = User.findById(userId).select("_id role status");

    if (req.dbSession) {
      query = query.session(req.dbSession);
    }

    const user = await query;

    if (user?.status !== USER_STATUSES.ACTIVE) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };
    req.currentUser = user;
  } catch (error) {
    if (error.statusCode >= 500) {
      return next(error);
    }

    req.user = null;
  }

  return next();
};
