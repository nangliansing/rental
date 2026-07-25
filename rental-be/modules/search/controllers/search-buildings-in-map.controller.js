// modules/search/controllers/search-buildings-in-map.controller.js
import { searchBuildingsInMapService } from "../services/index.js";

export const searchBuildingsInMapController = async (req, res, next) => {
    try {
        const result = await searchBuildingsInMapService({
            bodyInput: req.body,
            viewerUserId: req.user?.id ?? null,
            session: req.dbSession,
        });

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        return next(error);
    }
};
