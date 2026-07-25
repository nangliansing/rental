// modules/saved-listing/controllers/search-saved-listings.controller.js
import { searchSavedListingsService } from "../services/index.js";

export const searchSavedListingsController = async (req, res, next) => {
  try {
    const result = await searchSavedListingsService({
      actorId: req.currentUser._id,
      queryInput: req.query,
      session: req.dbSession,
    });

    return res.status(200).json({
      success: true,
      data: {
        savedListings: result.savedListings,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
