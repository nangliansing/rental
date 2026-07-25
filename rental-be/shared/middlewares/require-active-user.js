import { validateMongooseId } from "../validators/index.js";
import User from "../../modules/user/user.model.js";
import { assertActiveUser } from "../../modules/user/utils/index.js";

export const requireActiveUser = async (req, res, next) => {
  try {
    const userId = validateMongooseId(req.user?.id, "userId");

    let query = User.findById(userId).select("-password");

    if (req.dbSession) {
      query = query.session(req.dbSession);
    }

    const user = await query;

    assertActiveUser(user);

    req.currentUser = user;

    return next();
  } catch (error) {
    return next(error);
  }
};
