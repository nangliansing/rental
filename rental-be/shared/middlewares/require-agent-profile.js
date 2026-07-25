import { AppError } from "../errors/app-error.js";
import { validateMongooseId } from "../validators/index.js";
import AgentProfile from "../../modules/agent/agent-profile.model.js";

export const requireAgentProfile = async (req, res, next) => {
  try {
    const userId = validateMongooseId(req.currentUser?._id ?? req.user?.id, "userId");

    let query = AgentProfile.findOne({
      userId,
      isDeleted: { $ne: true },
    }).select("_id userId");

    if (req.dbSession) {
      query = query.session(req.dbSession);
    }

    const agentProfile = await query;

    if (!agentProfile) {
      throw new AppError(
        "Agent profile is required",
        403,
        "AGENT_PROFILE_REQUIRED",
      );
    }

    req.agentProfile = agentProfile;

    return next();
  } catch (error) {
    return next(error);
  }
};
