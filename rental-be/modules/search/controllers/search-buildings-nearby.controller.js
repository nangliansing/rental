// modules/search/controllers/search-buildings-nearby.controller.js
import { searchBuildingsNearbyService } from "../services/index.js";

export const searchBuildingsNearbyController = async (req, res, next) => {
    try {
        const result = await searchBuildingsNearbyService({
            bodyInput: req.body,
            viewerUserId: req.user?.id ?? null,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        return next(error);
    }
};
