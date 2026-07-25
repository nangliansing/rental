// modules/agent/controllers/owner-update-agent-profile.controller.js
import { ownerUpdateAgentProfileService } from "../services/index.js";

export const ownerUpdateAgentProfileController = async (req, res, next) => {
    try {
        const agentProfile = await ownerUpdateAgentProfileService(
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
