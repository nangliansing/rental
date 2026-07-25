// modules/agent/controllers/admin-update-agent-profile.controller.js
import { adminUpdateAgentProfileService } from "../services/index.js";

export const adminUpdateAgentProfileController = async (req, res, next) => {
  try {
    const agentProfile = await adminUpdateAgentProfileService(
      req.params.agentProfileId,
      req.body,
      req.currentUser._id
    );

    return res.status(200).json({
      success: true,
      data: agentProfile,
    });
  } catch (error) {
    return next(error);
  }
};
