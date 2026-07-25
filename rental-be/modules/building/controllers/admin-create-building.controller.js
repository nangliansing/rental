// modules/building/controllers/admin-create-building.controller.js
import { adminCreateBuildingService } from "../services/index.js";

export const adminCreateBuildingController = async (req, res, next) => {
    try {
        const building = await adminCreateBuildingService(req.body, req.user.id);

        return res.status(201).json({
            success: true,
            data: building,
        });
    } catch (error) {
        return next(error);
    }
};