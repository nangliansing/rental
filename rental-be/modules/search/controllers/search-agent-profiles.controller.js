// modules/search/controllers/search-agent-profiles.controller.js
import { searchAgentProfilesService } from "../services/index.js";

export const searchAgentProfilesController = async (req, res, next) => {
    try {
        const agentProfiles = await searchAgentProfilesService({
            queryInput: req.query,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: agentProfiles,
        });
    } catch (error) {
        return next(error);
    }
};
