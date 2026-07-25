// modules/listing/controllers/admin-create-listing.controller.js
import { adminCreateListingService } from "../services/index.js";

export const adminCreateListingController = async (req, res, next) => {
    try {
        const listing = await adminCreateListingService(req.body, req.user.id);

        return res.status(201).json({
            success: true,
            data: listing,
        });
    } catch (error) {
        return next(error);
    }
};