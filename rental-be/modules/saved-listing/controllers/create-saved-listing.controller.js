import { createSavedListingService } from "../services/index.js";

export const createSavedListingController = async (req, res, next) => {
  try {
    const savedListing = await createSavedListingService({
      listingId: req.params.listingId,
      actorId: req.currentUser._id,
      session: req.dbSession,
    });

    return res.status(201).json({
      success: true,
      data: savedListing,
    });
  } catch (error) {
    return next(error);
  }
};
