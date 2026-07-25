// modules/agent/controllers/get-my-agent-profile.controller.js
import { getMyAgentProfileService } from "../services/index.js";

export const getMyAgentProfileController = async (req, res, next) => {
    try {
        const agentProfile = await getMyAgentProfileService(req.currentUser._id);

        return res.status(200).json({
            success: true,
            data: agentProfile,
        });
    } catch (error) {
        return next(error);
    }
};
