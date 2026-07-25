// modules/building/controllers/admin-update-building.controller.js
import { adminUpdateBuildingService } from "../services/index.js";

export const adminUpdateBuildingController = async (req, res, next) => {
    try {
        const building = await adminUpdateBuildingService(
            req.params.buildingId,
            req.body,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            data: building,
        });
    } catch (error) {
        return next(error);
    }
};