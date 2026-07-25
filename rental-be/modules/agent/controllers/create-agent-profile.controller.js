// modules/agent/controllers/create-agent-profile.controller.js
import { createAgentProfileService } from "../services/index.js";

export const createAgentProfileController = async (req, res, next) => {
    try {
        const agentProfile = await createAgentProfileService(
            req.body,
            req.currentUser._id
        );

        return res.status(201).json({
            success: true,
            data: agentProfile,
        });
    } catch (error) {
        return next(error);
    }
};
