// modules/search/controllers/search-listings-in-building.controller.js
import { searchListingsInBuildingService } from "../services/index.js";

export const searchListingsInBuildingController = async (req, res, next) => {
    try {
        const result = await searchListingsInBuildingService({
            paramsInput: req.params,
            bodyInput: req.body,
            viewerUserId: req.user?.id ?? null,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: {
                building: result.building,
                listings: result.listings,
            },
            pagination: result.pagination,
        });
    } catch (error) {
        return next(error);
    }
};
