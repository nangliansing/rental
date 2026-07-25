// modules/agent/controllers/owner-delete-agent-profile.controller.js
import { ownerDeleteAgentProfileService } from "../services/index.js";

export const ownerDeleteAgentProfileController = async (req, res, next) => {
  try {
    const agentProfile = await ownerDeleteAgentProfileService({
      actorId: req.currentUser._id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: agentProfile,
    });
  } catch (error) {
    return next(error);
  }
};
