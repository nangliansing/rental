import { deleteSavedListingService } from "../services/index.js";

export const deleteSavedListingController = async (req, res, next) => {
  try {
    const savedListing = await deleteSavedListingService({
      listingId: req.params.listingId,
      actorId: req.currentUser._id,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: savedListing,
    });
  } catch (error) {
    return next(error);
  }
};
