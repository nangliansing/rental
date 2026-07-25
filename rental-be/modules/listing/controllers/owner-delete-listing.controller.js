// modules/listing/controllers/owner-delete-listing.controller.js
import { ownerDeleteListingService } from "../services/index.js";

export const ownerDeleteListingController = async (req, res, next) => {
  try {
    const listing = await ownerDeleteListingService({
      listingId: req.params.listingId,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    return next(error);
  }
};
