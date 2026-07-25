// modules/listing/controllers/owner-search-listing-by-id.controller.js
import { ownerSearchListingByIdService } from "../services/index.js";

export const ownerSearchListingByIdController = async (req, res, next) => {
    try {
        const result = await ownerSearchListingByIdService({
            paramsInput: req.params,
            actorId: req.currentUser._id,
            session: req.dbSession ?? null,
        });

        return res.status(200).json({
            success: true,
            data: {
                agentProfile: result.agentProfile,
                listing: result.listing,
            },
        });
    } catch (error) {
        return next(error);
    }
};
