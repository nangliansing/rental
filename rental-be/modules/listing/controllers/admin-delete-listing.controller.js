// modules/listing/controllers/admin-delete-listing.controller.js
import { adminDeleteListingService } from "../services/index.js";

export const adminDeleteListingController = async (req, res, next) => {
  try {
    const listing = await adminDeleteListingService({
      listingId: req.params.listingId,
      actorId: req.user.id,
      body: req.body,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    return next(error);
  }
};
