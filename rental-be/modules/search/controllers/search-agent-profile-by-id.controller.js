// modules/search/controllers/search-agent-profile-by-id.controller.js
import { searchAgentProfileByIdService } from "../services/index.js";

export const searchAgentProfileByIdController = async (req, res, next) => {
    try {
        const agentProfile = await searchAgentProfileByIdService({
            paramsInput: req.params,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: {
                agentProfile,
            },
        });
    } catch (error) {
        return next(error);
    }
};
