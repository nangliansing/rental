// modules/listing/controllers/owner-search-listings.controller.js
import { ownerSearchListingsService } from "../services/index.js";

export const ownerSearchListingsController = async (req, res, next) => {
  try {
    const result = await ownerSearchListingsService({
      queryInput: req.query,
      actorId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: {
        agentProfile: result.agentProfile,
        listings: result.listings,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
