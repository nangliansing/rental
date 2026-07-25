// modules/search/controllers/search-listings-by-agent.controller.js
import { searchListingsByAgentService } from "../services/index.js";

export const searchListingsByAgentController = async (req, res, next) => {
    try {
        const result = await searchListingsByAgentService({
            paramsInput: req.params,
            queryInput: req.query,
            viewerUserId: req.user?.id ?? null,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: {
                agentProfile: result.agentProfile,
                listings: result.listings,
            },
            pagination: result.pagination,
        });
    } catch (error) {
        return next(error);
    }
};
