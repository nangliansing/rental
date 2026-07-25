// modules/search/controllers/search-listing-by-id.controller.js
import { searchListingByIdService } from "../services/index.js";

export const searchListingByIdController = async (req, res, next) => {
    try {
        const result = await searchListingByIdService({
            paramsInput: req.params,
            viewerUserId: req.user?.id ?? null,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: {
                listing: result.listing,
            },
        });
    } catch (error) {
        return next(error);
    }
};
